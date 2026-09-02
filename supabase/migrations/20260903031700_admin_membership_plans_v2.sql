create table if not exists public.membership_plans(
  id text primary key,name text not null,price_minor integer not null default 0 check(price_minor>=0),currency char(3) not null default 'PEN',duration_days integer not null default 30 check(duration_days>0),benefits jsonb not null default '[]'::jsonb,region text not null default 'PE-LIM',active boolean not null default false,paid boolean not null default true,updated_by uuid,updated_at timestamptz not null default now()
);
alter table public.membership_plans enable row level security;
revoke all on public.membership_plans from public,anon,authenticated;
insert into public.membership_plans(id,name,price_minor,currency,duration_days,benefits,region,active,paid) values
 ('free','Free',0,'PEN',36500,'["Perfil","Likes y matches","Chat con match"]'::jsonb,'PE-LIM',true,false),
 ('premium','Premium',0,'PEN',30,'["Filtros avanzados","Más visibilidad","Funciones premium futuras"]'::jsonb,'PE-LIM',false,true),
 ('superfuego','SuperFuego',0,'PEN',30,'["Prioridad futura","Controles premium futuros"]'::jsonb,'PE-LIM',false,true)
on conflict(id) do nothing;
create or replace function public.admin_get_membership_plans()
returns setof public.membership_plans language plpgsql stable security definer set search_path='public','pg_temp' as $$ begin if not public.admin_has_any_role(array['super_admin','finance','analyst']) then raise exception 'forbidden' using errcode='42501'; end if; return query select * from public.membership_plans order by paid,id; end;$$;
create or replace function public.admin_update_membership_plan(p_id text,p_price_minor integer,p_duration_days integer,p_benefits jsonb,p_region text,p_active boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path='public','auth','pg_temp' as $$
declare before_row public.membership_plans%rowtype; qualified integer:=0; threshold integer:=100;
begin
 if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
 if length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required'; end if;
 select * into before_row from public.membership_plans where id=p_id for update; if not found then raise exception 'plan_not_found'; end if;
 if p_price_minor<0 or p_duration_days<1 or p_duration_days>3650 then raise exception 'invalid_plan'; end if;
 if before_row.paid and p_active then
   select coalesce((value #>> '{}')::int,100) into threshold from public.admin_operation_settings where key='commercialization_threshold';
   select count(distinct p.id)::int into qualified from public.profiles p join auth.users u on u.id=p.id join public.user_private priv on priv.user_id=p.id
   where p.country_code='PE' and lower(p.city)='lima' and p.profile_completion>=80 and p.status='active' and u.email_confirmed_at is not null and priv.birth_date<=current_date-interval '18 years' and exists(select 1 from public.profile_photos ph where ph.user_id=p.id and ph.status='approved');
   if qualified<threshold or not exists(select 1 from public.feature_flags where key='MEMBERSHIP_ENABLED' and enabled=true) then raise exception 'commercial_gate_locked'; end if;
 end if;
 update public.membership_plans set price_minor=p_price_minor,duration_days=p_duration_days,benefits=coalesce(p_benefits,'[]'::jsonb),region=coalesce(nullif(trim(p_region),''),'PE-LIM'),active=p_active,updated_by=auth.uid(),updated_at=now() where id=p_id;
 insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary) values(auth.uid(),'membership_plan_changed','membership_plan',p_id,left(p_reason,500),to_jsonb(before_row),(select to_jsonb(x) from public.membership_plans x where x.id=p_id));
 return jsonb_build_object('ok',true,'id',p_id);
end;$$;
revoke all on function public.admin_get_membership_plans() from public,anon;
revoke all on function public.admin_update_membership_plan(text,integer,integer,jsonb,text,boolean,text) from public,anon;
grant execute on function public.admin_get_membership_plans() to authenticated;
grant execute on function public.admin_update_membership_plan(text,integer,integer,jsonb,text,boolean,text) to authenticated;