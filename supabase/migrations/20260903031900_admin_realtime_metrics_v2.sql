create or replace function public.admin_get_realtime_metrics_v2()
returns jsonb language plpgsql stable security definer set search_path='public','pg_temp' as $$
begin
  if not public.admin_has_any_role(array['super_admin','analyst']) then raise exception 'forbidden' using errcode='42501'; end if;
  return jsonb_build_object('messages1m',(select count(*) from public.messages where created_at>=now()-interval '1 minute'),'messages5m',(select count(*) from public.messages where created_at>=now()-interval '5 minutes'),'messages1h',(select count(*) from public.messages where created_at>=now()-interval '1 hour'),'activeProfiles5m',(select count(*) from public.profiles where last_active_at>=now()-interval '5 minutes'),'activeProfiles1h',(select count(*) from public.profiles where last_active_at>=now()-interval '1 hour'),'generatedAt',now());
end;$$;
revoke all on function public.admin_get_realtime_metrics_v2() from public,anon;
grant execute on function public.admin_get_realtime_metrics_v2() to authenticated;