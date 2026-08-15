-- CitaFuego V1.0 RC / 020_superfuego_entitlements.sql
-- Enable SuperFuego using server-side Gold entitlement or entitlement-ledger credits.

create or replace function public.perform_interaction(p_to_user uuid,p_action public.interaction_action)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_from uuid:=auth.uid(); v_today_count integer; v_limit integer:=25; v_plan text:='free'; v_match_id uuid; v_conversation_id uuid;
  v_user_a uuid; v_user_b uuid; v_period_start timestamptz; v_super_limit integer:=0; v_super_used integer:=0; v_credit_balance integer:=0; v_existing public.interaction_action;
begin
  if v_from is null then raise exception 'not_authenticated'; end if;
  if p_to_user is null or p_to_user=v_from then raise exception 'invalid_target'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_from::text,0));
  if not exists(select 1 from public.profiles p where p.id=v_from and p.status='active') then raise exception 'profile_not_active'; end if;
  if not exists(select 1 from public.profiles p where p.id=p_to_user and p.status='active') then raise exception 'target_unavailable'; end if;
  if exists(select 1 from public.blocks b where (b.blocker_id=v_from and b.blocked_id=p_to_user) or (b.blocker_id=p_to_user and b.blocked_id=v_from)) then raise exception 'blocked_pair'; end if;

  select s.product_id,s.current_period_start,coalesce((cp.entitlements->>'superfuegos_per_period')::integer,0)
  into v_plan,v_period_start,v_super_limit
  from public.subscriptions s join public.catalog_products cp on cp.id=s.product_id
  where s.user_id=v_from and s.status in ('trialing','active') and (s.current_period_end is null or s.current_period_end>now())
  order by s.created_at desc limit 1;
  if v_plan in ('fuego_plus','fuego_gold') then v_limit:=9999; end if;

  if p_action in ('like','superfuego') then
    select count(*) into v_today_count from public.interactions i where i.from_user_id=v_from and i.action in ('like','superfuego') and i.created_at>=date_trunc('day',now());
    if v_today_count>=v_limit then raise exception 'daily_like_limit_reached'; end if;
  end if;

  select action into v_existing from public.interactions where from_user_id=v_from and to_user_id=p_to_user;
  if p_action='superfuego' and v_existing is distinct from 'superfuego' then
    if v_plan='fuego_gold' and v_super_limit>0 then
      select count(*) into v_super_used from public.interactions i where i.from_user_id=v_from and i.action='superfuego' and i.updated_at>=coalesce(v_period_start,date_trunc('month',now()));
      if v_super_used>=v_super_limit then raise exception 'superfuego_limit_reached'; end if;
    else
      select coalesce(sum(delta),0)::integer into v_credit_balance from public.entitlement_ledger e where e.user_id=v_from and e.entitlement='superfuego_credits' and (e.expires_at is null or e.expires_at>now());
      if v_credit_balance<1 then raise exception 'superfuego_required'; end if;
      insert into public.entitlement_ledger(user_id,entitlement,delta,source_type,source_id) values(v_from,'superfuego_credits',-1,'interaction',p_to_user::text);
    end if;
  end if;

  insert into public.interactions(from_user_id,to_user_id,action) values(v_from,p_to_user,p_action)
  on conflict(from_user_id,to_user_id) do update set action=excluded.action,updated_at=now();

  if p_action in ('like','superfuego') and exists(select 1 from public.interactions i where i.from_user_id=p_to_user and i.to_user_id=v_from and i.action in ('like','superfuego')) then
    if v_from::text<p_to_user::text then v_user_a:=v_from;v_user_b:=p_to_user;else v_user_a:=p_to_user;v_user_b:=v_from;end if;
    insert into public.matches(user_a,user_b,status) values(v_user_a,v_user_b,'active')
    on conflict(user_a,user_b) do update set status='active',ended_at=null returning id into v_match_id;
    insert into public.conversations(match_id) values(v_match_id)
    on conflict(match_id) do update set match_id=excluded.match_id returning id into v_conversation_id;
    insert into public.conversation_members(conversation_id,user_id) values(v_conversation_id,v_user_a),(v_conversation_id,v_user_b) on conflict do nothing;
    return jsonb_build_object('matched',true,'match_id',v_match_id,'conversation_id',v_conversation_id);
  end if;
  return jsonb_build_object('matched',false);
end; $$;
revoke all on function public.perform_interaction(uuid,public.interaction_action) from public,anon;
grant execute on function public.perform_interaction(uuid,public.interaction_action) to authenticated;
