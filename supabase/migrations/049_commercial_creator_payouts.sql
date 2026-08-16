-- Commercialization V2 payout reservations and Segpay Partner Payout batch state.
update public.commercialization_providers set secret_env_refs=array['SEGPAY_MERCHANT_ID','SEGPAY_SRS_USER_ID','SEGPAY_SRS_ACCESS_KEY','SEGPAY_BASE_URL','SEGPAY_POSTBACK_SECRET'],updated_at=now() where provider_slug='segpay';

alter table public.creator_payout_requests add column if not exists commercial_v2 boolean not null default false;
alter table public.creator_payout_requests drop constraint if exists creator_payout_requests_status_check;
alter table public.creator_payout_requests add constraint creator_payout_requests_status_check check(status in ('pending','approved','processing','rejected','paid','failed'));

create or replace function public.get_commercial_creator_dashboard() returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); v jsonb; held bigint:=0; gross_available bigint:=0; reserved bigint:=0; paid bigint:=0; reversed bigint:=0; net_available bigint:=0;
begin
 if u is null then raise exception 'not_authenticated'; end if;
 select coalesce(sum(creator_usd_micros) filter(where status='held'),0),coalesce(sum(creator_usd_micros) filter(where status='available'),0),coalesce(sum(abs(creator_usd_micros)) filter(where status='reversed'),0) into held,gross_available,reversed from public.creator_commercial_ledger where user_id=u;
 select coalesce(sum(amount_usd_micros) filter(where commercial_v2 and status in ('pending','approved','processing')),0),coalesce(sum(amount_usd_micros) filter(where commercial_v2 and status='paid'),0) into reserved,paid from public.creator_payout_requests where user_id=u;
 net_available:=greatest(gross_available-reserved-paid,0);
 select jsonb_build_object(
  'commercialProfile',(select to_jsonb(c) from public.creator_commercial_profiles c where c.user_id=u),
  'tier',(select to_jsonb(t) from public.creator_tiers t join public.creator_commercial_profiles c on c.tier_slug=t.tier_slug where c.user_id=u),
  'balances',jsonb_build_object('heldUsdMicros',held,'availableUsdMicros',net_available,'reservedPayoutUsdMicros',reserved,'paidUsdMicros',paid,'reversedUsdMicros',reversed),
  'metrics30d',(select jsonb_build_object('qualifiedViews',coalesce(sum(m.qualified_views),0),'filteredViews',coalesce(sum(m.filtered_views),0),'watchMs',coalesce(sum(m.qualified_watch_ms),0),'engagements',coalesce(sum(m.likes+m.comments+m.saves+m.shares),0),'rewardPoints',coalesce(sum(m.reward_points),0)) from public.creator_content_metrics_daily m where m.user_id=u and m.metric_date>=current_date-29),
  'recentLedger',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id,source_type,gross_usd_micros,platform_usd_micros,creator_usd_micros,reserve_usd_micros,status,hold_until,provider_slug,note,created_at from public.creator_commercial_ledger where user_id=u order by created_at desc limit 40)x),'[]'::jsonb),
  'brandApplications',coalesce((select jsonb_agg(jsonb_build_object('opportunityId',a.opportunity_id,'status',a.status,'title',o.title,'compensationType',o.compensation_type,'flatFeeUsdMicros',o.flat_fee_usd_micros) order by a.created_at desc) from public.brand_opportunity_applications a join public.brand_opportunities o on o.id=a.opportunity_id where a.creator_user_id=u),'[]'::jsonb),
  'commercialPayouts',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id,amount_usd_micros,status,provider_slug,provider_payout_ref,external_reference,failure_reason,created_at,paid_at from public.creator_payout_requests where user_id=u and commercial_v2 order by created_at desc limit 30)x),'[]'::jsonb)
 ) into v;
 return v;
end; $$;
revoke all on function public.get_commercial_creator_dashboard() from public,anon;
grant execute on function public.get_commercial_creator_dashboard() to authenticated;

create or replace function public.request_commercial_creator_payout(p_amount_usd_micros bigint) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); gross_available bigint:=0; reserved bigint:=0; paid bigint:=0; net_available bigint:=0; minimum bigint:=25000000; rid bigint;
begin
 if u is null then raise exception 'not_authenticated'; end if;
 if not exists(select 1 from public.creator_commercial_profiles c where c.user_id=u and c.program_status='active' and c.kyc_status='verified' and c.tax_status='verified' and c.payout_status='ready' and c.provider_partner_ref is not null) then raise exception 'creator_payout_not_ready'; end if;
 select coalesce(cp.payout_min_usd_micros,25000000) into minimum from public.creator_profiles cp where cp.user_id=u and cp.active=true;
 select coalesce(sum(creator_usd_micros) filter(where status='available'),0) into gross_available from public.creator_commercial_ledger where user_id=u;
 select coalesce(sum(amount_usd_micros) filter(where commercial_v2 and status in ('pending','approved','processing')),0),coalesce(sum(amount_usd_micros) filter(where commercial_v2 and status='paid'),0) into reserved,paid from public.creator_payout_requests where user_id=u;
 net_available:=greatest(gross_available-reserved-paid,0);
 if p_amount_usd_micros<minimum then raise exception 'below_minimum'; end if;
 if p_amount_usd_micros>net_available then raise exception 'insufficient_available_balance'; end if;
 insert into public.creator_payout_requests(user_id,amount_usd_micros,status,payout_method_label,provider_slug,commercial_v2,net_usd_micros) values(u,p_amount_usd_micros,'pending','Segpay Partner Payout','segpay',true,p_amount_usd_micros) returning id into rid;
 return jsonb_build_object('ok',true,'requestId',rid,'status','pending','availableAfterUsdMicros',net_available-p_amount_usd_micros);
end; $$;
revoke all on function public.request_commercial_creator_payout(bigint) from public,anon;
grant execute on function public.request_commercial_creator_payout(bigint) to authenticated;

create or replace function public.admin_review_commercial_payout(p_request bigint,p_decision text,p_reason text default null,p_provider_ref text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r public.creator_payout_requests%rowtype;
begin
 if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
 if p_decision not in ('approved','processing','rejected','paid','failed') then raise exception 'invalid_decision'; end if;
 select * into r from public.creator_payout_requests where id=p_request and commercial_v2=true for update; if not found then raise exception 'not_found'; end if;
 if r.status='paid' and p_decision<>'paid' then raise exception 'already_paid'; end if;
 update public.creator_payout_requests set status=p_decision,review_reason=case when p_decision='rejected' then p_reason else review_reason end,failure_reason=case when p_decision='failed' then p_reason else failure_reason end,provider_payout_ref=coalesce(p_provider_ref,provider_payout_ref),external_reference=coalesce(p_provider_ref,external_reference),reviewed_by=auth.uid(),reviewed_at=now(),paid_at=case when p_decision='paid' then now() else paid_at end where id=p_request;
 return jsonb_build_object('ok',true,'requestId',p_request,'status',p_decision);
end; $$;
revoke all on function public.admin_review_commercial_payout(bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_review_commercial_payout(bigint,text,text,text) to authenticated;
