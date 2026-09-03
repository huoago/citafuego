create table if not exists public.admin_membership_grants(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id text not null check(product_id in ('fuego_plus','fuego_gold')),
  duration_days integer not null check(duration_days between 1 and 3650),
  mode text not null check(mode in ('replace','extend')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null,
  subscription_id uuid not null,
  granted_by uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_membership_grants_user_idx on public.admin_membership_grants(user_id,created_at desc);
create index if not exists admin_membership_grants_end_idx on public.admin_membership_grants(ends_at desc);
alter table public.admin_membership_grants enable row level security;
revoke all on public.admin_membership_grants from public,anon,authenticated;

create or replace function public.admin_grant_membership(p_user uuid,p_product text,p_duration_days integer,p_mode text default 'replace',p_reason text default 'Asignación manual desde backoffice')
returns jsonb
language plpgsql
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  a uuid:=auth.uid();
  start_at timestamptz:=now();
  end_at timestamptz;
  sub_id uuid:=gen_random_uuid();
  grant_id uuid:=gen_random_uuid();
  base_end timestamptz;
begin
  if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_product not in ('fuego_plus','fuego_gold') then raise exception 'unsupported_membership'; end if;
  if p_duration_days<1 or p_duration_days>3650 then raise exception 'invalid_duration'; end if;
  if p_mode not in ('replace','extend') then raise exception 'invalid_mode'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'reason_required'; end if;
  if not exists(select 1 from auth.users where id=p_user) then raise exception 'user_not_found'; end if;
  if p_user=a then raise exception 'cannot_grant_to_self'; end if;
  if p_mode='replace' then
    update public.subscriptions set status='expired',current_period_end=least(coalesce(current_period_end,now()),now()),updated_at=now()
    where user_id=p_user and product_id=p_product and provider='admin_manual' and status in ('trialing','active');
    base_end:=now();
  else
    select greatest(now(),coalesce(max(current_period_end),now())) into base_end
    from public.subscriptions where user_id=p_user and product_id=p_product and status in ('trialing','active');
  end if;
  end_at:=base_end+make_interval(days=>p_duration_days);
  insert into public.subscriptions(id,user_id,product_id,provider,provider_customer_id,provider_subscription_id,status,current_period_start,current_period_end,cancel_at_period_end,created_at,updated_at)
  values(sub_id,p_user,p_product,'admin_manual',null,'admin:'||sub_id::text,'active',start_at,end_at,false,now(),now());
  insert into public.admin_membership_grants(id,user_id,product_id,duration_days,mode,starts_at,ends_at,reason,subscription_id,granted_by)
  values(grant_id,p_user,p_product,p_duration_days,p_mode,start_at,end_at,left(trim(p_reason),500),sub_id,a);
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,after_summary)
  values(a,'membership_granted','user',p_user::text,left(trim(p_reason),500),jsonb_build_object('product_id',p_product,'duration_days',p_duration_days,'mode',p_mode,'subscription_id',sub_id,'ends_at',end_at));
  return jsonb_build_object('ok',true,'grant_id',grant_id,'subscription_id',sub_id,'user_id',p_user,'product_id',p_product,'ends_at',end_at);
end;$$;

create or replace function public.admin_get_manual_memberships(p_limit integer default 100)
returns table(grant_id uuid,user_id uuid,display_name text,email text,product_id text,duration_days integer,mode text,starts_at timestamptz,ends_at timestamptz,reason text,granted_by uuid,created_at timestamptz)
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
begin
  if not public.admin_has_any_role(array['super_admin','finance','analyst']) then raise exception 'forbidden' using errcode='42501'; end if;
  return query
  select g.id,g.user_id,p.display_name,u.email::text,g.product_id,g.duration_days,g.mode,g.starts_at,g.ends_at,g.reason,g.granted_by,g.created_at
  from public.admin_membership_grants g
  left join public.profiles p on p.id=g.user_id
  left join auth.users u on u.id=g.user_id
  order by g.created_at desc
  limit least(greatest(coalesce(p_limit,100),1),250);
end;$$;

revoke all on function public.admin_grant_membership(uuid,text,integer,text,text) from public,anon;
grant execute on function public.admin_grant_membership(uuid,text,integer,text,text) to authenticated;
revoke all on function public.admin_get_manual_memberships(integer) from public,anon;
grant execute on function public.admin_get_manual_memberships(integer) to authenticated;
