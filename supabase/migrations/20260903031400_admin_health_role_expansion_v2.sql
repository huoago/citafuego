create or replace function public.admin_get_health_snapshot()
returns jsonb
language plpgsql stable security definer
set search_path='public','auth','pg_temp'
as $$
declare open_reports integer; pending_verifications integer;
begin
 if not public.admin_has_any_role(array['super_admin','trust_safety','support','analyst','seo']) then raise exception 'forbidden' using errcode='42501'; end if;
 select count(*) into open_reports from public.reports where status in('open','triaged','investigating');
 select count(*) into pending_verifications from public.verification_sessions where status='pending';
 return jsonb_build_object(
  'status',case when open_reports>50 then 'CRITICAL' when open_reports>15 or pending_verifications>25 then 'WARNING' else 'HEALTHY' end,
  'database','HEALTHY','rlsTables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity),
  'openReports',open_reports,'pendingVerifications',pending_verifications,
  'failedPurchases',(select count(*) from public.purchases where status='failed' and created_at>now()-interval '24 hours'),
  'activeUsers24h',(select count(*) from public.profiles where last_active_at>now()-interval '24 hours'),
  'generatedAt',now()
 );
end $$;
revoke all on function public.admin_get_health_snapshot() from public,anon;
grant execute on function public.admin_get_health_snapshot() to authenticated;