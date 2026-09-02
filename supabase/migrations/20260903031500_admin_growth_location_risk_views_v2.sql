create or replace function public.admin_get_location_metrics_v2()
returns table(slug text,name text,status text,minimum_active_profiles integer,nearby_districts text[],active_profiles bigint,total_profiles bigint,updated_at timestamptz)
language plpgsql stable security definer set search_path='public','pg_temp' as $$
begin
  if not public.admin_has_any_role(array['super_admin','growth','analyst','seo']) then raise exception 'forbidden' using errcode='42501'; end if;
  return query select d.slug,d.name,d.status,d.minimum_active_profiles,d.nearby_districts,
    (select count(*) from public.profiles p where lower(coalesce(p.district,''))=lower(d.name) and p.status='active' and p.last_active_at>=now()-interval '30 days'),
    (select count(*) from public.profiles p where lower(coalesce(p.district,''))=lower(d.name)),d.updated_at
  from public.lima_district_settings d order by d.name;
end;$$;

create or replace function public.admin_get_growth_dashboard_v2()
returns jsonb language plpgsql stable security definer set search_path='public','pg_temp' as $$
begin
  if not public.admin_has_any_role(array['super_admin','growth','analyst']) then raise exception 'forbidden' using errcode='42501'; end if;
  return jsonb_build_object(
    'referrals',jsonb_build_object('total',(select count(*) from public.referrals),'qualified',(select count(*) from public.referrals where qualified_at is not null or status='qualified'),'pending',(select count(*) from public.referrals where qualified_at is null and status not in ('rejected','fraud','revoked')),'last7d',(select count(*) from public.referrals where created_at>=now()-interval '7 days')),
    'boosts',jsonb_build_object('active',(select count(*) from public.boost_activations where ends_at>now()),'last7d',(select count(*) from public.boost_activations where created_at>=now()-interval '7 days'),'walletDays',(select coalesce(sum(available_days),0) from public.boost_wallets)),
    'ledger',jsonb_build_object('grantedDays',(select coalesce(sum(greatest(days_delta,0)),0) from public.boost_wallet_ledger),'revokedDays',(select coalesce(sum(abs(least(days_delta,0))),0) from public.boost_wallet_ledger))
  );
end;$$;

create or replace function public.admin_get_risk_queue_v2(p_limit integer default 100)
returns table(user_id uuid,display_name text,score numeric,tier text,reports_received bigint,blocks_received bigint,devices bigint,untrusted_devices bigint,calculated_at timestamptz)
language plpgsql stable security definer set search_path='public','pg_temp' as $$
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety','analyst']) then raise exception 'forbidden' using errcode='42501'; end if;
  return query select r.user_id,p.display_name,r.score,r.tier,
    (select count(*) from public.reports x where x.reported_user_id=r.user_id),
    (select count(*) from public.blocks b where b.blocked_id=r.user_id),
    (select count(*) from public.user_devices d where d.user_id=r.user_id),
    (select count(*) from public.user_devices d where d.user_id=r.user_id and d.trusted=false),r.calculated_at
  from public.user_risk_scores r left join public.profiles p on p.id=r.user_id order by r.score desc nulls last,r.calculated_at desc limit least(greatest(coalesce(p_limit,100),1),250);
end;$$;

revoke all on function public.admin_get_location_metrics_v2() from public,anon;
revoke all on function public.admin_get_growth_dashboard_v2() from public,anon;
revoke all on function public.admin_get_risk_queue_v2(integer) from public,anon;
grant execute on function public.admin_get_location_metrics_v2() to authenticated;
grant execute on function public.admin_get_growth_dashboard_v2() to authenticated;
grant execute on function public.admin_get_risk_queue_v2(integer) to authenticated;