create or replace function public.run_commercialization_daily_maintenance(p_date date default current_date-1) returns jsonb
language plpgsql security definer set search_path=public as $$
declare metrics integer:=0; tiers integer:=0; released integer:=0;
begin
 if coalesce(auth.role(),'')<>'service_role' and not public.admin_has_any_role(array['super_admin','finance','analyst']) then raise exception 'forbidden'; end if;
 metrics:=public.refresh_creator_commercial_metrics(p_date);
 tiers:=public.refresh_creator_tiers();
 update public.creator_commercial_ledger l set status='available',updated_at=now()
 where l.status='held' and coalesce(l.hold_until,now())<=now()
   and not exists(select 1 from public.commercial_fraud_events f where f.creator_id=l.user_id and f.resolved=false and f.action in ('hold','block') and f.created_at>=l.created_at);
 get diagnostics released=row_count;
 return jsonb_build_object('ok',true,'date',p_date,'metricsRows',metrics,'tierChanges',tiers,'releasedLedgerRows',released);
end; $$;
revoke all on function public.run_commercialization_daily_maintenance(date) from public,anon,authenticated;
grant execute on function public.run_commercialization_daily_maintenance(date) to service_role;
grant execute on function public.run_commercialization_daily_maintenance(date) to authenticated;
