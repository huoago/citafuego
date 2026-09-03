-- Align operational metrics with current timestamp columns.
create or replace function public.admin_get_operations_metrics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'auth'
as $function$
declare d integer:=least(greatest(coalesce(p_days,30),1),365);
begin
 if not public.admin_has_any_role(array['super_admin','trust_safety','support','finance','analyst']) then raise exception 'forbidden'; end if;
 return jsonb_build_object(
  'periodDays',d,'registered',(select count(*) from public.profiles),
  'activeProfiles',(select count(*) from public.profiles where status='active'),
  'verifiedProfiles',(select count(*) from public.profiles where verification_badge or identity_verification_badge),
  'likes',(select count(*) from public.interactions where action='like' and created_at>=now()-make_interval(days=>d)),
  'matches',(select count(*) from public.matches where matched_at>=now()-make_interval(days=>d)),
  'reports',(select count(*) from public.reports where created_at>=now()-make_interval(days=>d)),
  'openReports',(select count(*) from public.reports where status in('open','triaged','investigating')),
  'events',(select count(*) from public.analytics_events where occurred_at>=now()-make_interval(days=>d)),
  'medianReportHours',(select coalesce(round(percentile_cont(.5) within group(order by extract(epoch from(resolved_at-created_at))/3600)::numeric,2),0) from public.reports where resolved_at is not null and created_at>=now()-make_interval(days=>d))
 );
end $function$;
