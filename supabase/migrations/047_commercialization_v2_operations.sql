-- Commercialization V2 operations: metric qualification, tiering, reward pools,
-- creator/advertiser review, marketplace deal creation and real provider registration.

insert into public.ad_networks(provider_slug,display_name,mode,enabled,public_config,secret_env_ref)
values('exoclick','ExoClick','external',false,jsonb_build_object('scriptHost','https://a.magsrv.com/ad-provider.js','sfwDefault',true,'apiBase','https://api.exoclick.com/v2'),'EXOCLICK_API_TOKEN')
on conflict(provider_slug) do update set display_name=excluded.display_name,mode='external',public_config=excluded.public_config,secret_env_ref=excluded.secret_env_ref,updated_at=now();

create or replace function public.refresh_creator_commercial_metrics(p_date date default current_date-1) returns integer
language plpgsql security definer set search_path=public as $$
declare n integer:=0;
begin
 if auth.uid() is not null and not public.admin_has_any_role(array['super_admin','finance','analyst']) then raise exception 'forbidden'; end if;
 with creators as (
   select cp.user_id,coalesce(t.reward_multiplier_bps,10000) multiplier
   from public.creator_profiles cp left join public.creator_commercial_profiles ccp on ccp.user_id=cp.user_id left join public.creator_tiers t on t.tier_slug=coalesce(ccp.tier_slug,'starter')
   where cp.active=true
 ), qv as (
   select re.target_user_id creator_id,count(distinct (re.user_id::text||':'||coalesce(re.content_id::text,''))) qualified_views,
          sum(least(coalesce(re.dwell_ms,0),300000)) qualified_watch_ms
   from public.recommendation_events re
   where re.occurred_at>=p_date::timestamptz and re.occurred_at<(p_date+1)::timestamptz
     and re.event_type='dwell' and re.content_type='blog' and coalesce(re.dwell_ms,0)>=5000
     and re.target_user_id is not null and re.user_id<>re.target_user_id
   group by re.target_user_id
 ), likes as (
   select bp.author_id creator_id,count(*) n from public.blog_likes l join public.blog_posts bp on bp.id=l.post_id where l.created_at>=p_date::timestamptz and l.created_at<(p_date+1)::timestamptz and l.user_id<>bp.author_id group by bp.author_id
 ), comments as (
   select bp.author_id creator_id,count(*) n from public.blog_comments c join public.blog_posts bp on bp.id=c.post_id where c.created_at>=p_date::timestamptz and c.created_at<(p_date+1)::timestamptz and c.status='active' and c.user_id<>bp.author_id group by bp.author_id
 ), saves as (
   select bp.author_id creator_id,count(*) n from public.blog_bookmarks b join public.blog_posts bp on bp.id=b.post_id where b.created_at>=p_date::timestamptz and b.created_at<(p_date+1)::timestamptz and b.user_id<>bp.author_id group by bp.author_id
 ), shares as (
   select bp.author_id creator_id,count(*) n from public.blog_shares s join public.blog_posts bp on bp.id=s.post_id where s.created_at>=p_date::timestamptz and s.created_at<(p_date+1)::timestamptz and s.user_id<>bp.author_id group by bp.author_id
 ), follows as (
   select followed_id creator_id,count(*) n from public.social_follows where created_at>=p_date::timestamptz and created_at<(p_date+1)::timestamptz group by followed_id
 ), suspicious as (
   select re.target_user_id creator_id,count(*) filtered
   from public.recommendation_events re
   where re.occurred_at>=p_date::timestamptz and re.occurred_at<(p_date+1)::timestamptz and re.event_type='dwell' and re.content_type='blog'
     and (coalesce(re.dwell_ms,0)<5000 or re.user_id=re.target_user_id)
   group by re.target_user_id
 )
 insert into public.creator_content_metrics_daily(metric_date,user_id,qualified_views,filtered_views,qualified_watch_ms,likes,comments,saves,shares,follows_generated,reward_points)
 select p_date,c.user_id,coalesce(q.qualified_views,0),coalesce(su.filtered,0),coalesce(q.qualified_watch_ms,0),coalesce(l.n,0),coalesce(cm.n,0),coalesce(sa.n,0),coalesce(sh.n,0),coalesce(f.n,0),
   round(((coalesce(q.qualified_views,0)::numeric)+(coalesce(q.qualified_watch_ms,0)::numeric/60000.0*.15)+((coalesce(l.n,0)+coalesce(cm.n,0)+coalesce(sa.n,0)+coalesce(sh.n,0))::numeric*3)+(coalesce(f.n,0)::numeric*5))*c.multiplier/10000.0,6)
 from creators c left join qv q on q.creator_id=c.user_id left join likes l on l.creator_id=c.user_id left join comments cm on cm.creator_id=c.user_id left join saves sa on sa.creator_id=c.user_id left join shares sh on sh.creator_id=c.user_id left join follows f on f.creator_id=c.user_id left join suspicious su on su.creator_id=c.user_id
 on conflict(metric_date,user_id) do update set qualified_views=excluded.qualified_views,filtered_views=excluded.filtered_views,qualified_watch_ms=excluded.qualified_watch_ms,likes=excluded.likes,comments=excluded.comments,saves=excluded.saves,shares=excluded.shares,follows_generated=excluded.follows_generated,reward_points=excluded.reward_points;
 get diagnostics n=row_count;

 insert into public.commercial_fraud_events(creator_id,source,rule_code,risk_score,action,metadata)
 select re.target_user_id,'creator_rewards','repeat_view_velocity',75,'hold',jsonb_build_object('viewer',re.user_id,'events',count(*),'date',p_date)
 from public.recommendation_events re
 where re.occurred_at>=p_date::timestamptz and re.occurred_at<(p_date+1)::timestamptz and re.event_type='dwell' and re.content_type='blog' and re.target_user_id is not null and re.user_id<>re.target_user_id
 group by re.target_user_id,re.user_id having count(*)>50
 on conflict do nothing;
 return n;
end; $$;
revoke all on function public.refresh_creator_commercial_metrics(date) from public,anon,authenticated;
grant execute on function public.refresh_creator_commercial_metrics(date) to authenticated;

create or replace function public.refresh_creator_tiers() returns integer
language plpgsql security definer set search_path=public as $$
declare n integer:=0;
begin
 if auth.uid() is not null and not public.admin_has_any_role(array['super_admin','finance','analyst']) then raise exception 'forbidden'; end if;
 insert into public.creator_commercial_profiles(user_id,tier_slug,program_status,provider_slug)
 select c.user_id,'starter',case when a.status='approved' then 'active' else 'pending' end,'segpay' from public.creator_profiles c left join public.creator_applications a on a.user_id=c.user_id where c.active=true
 on conflict(user_id) do nothing;
 with stats as (
  select c.user_id,(select count(*) from public.social_follows f where f.followed_id=c.user_id)::int followers,
    coalesce(sum(m.qualified_views),0)::bigint qv,
    coalesce(sum(m.likes+m.comments+m.saves+m.shares),0)::bigint eng
  from public.creator_commercial_profiles c left join public.creator_content_metrics_daily m on m.user_id=c.user_id and m.metric_date>=current_date-29
  group by c.user_id
 ), ranked as (
  select s.user_id,coalesce((select t.tier_slug from public.creator_tiers t where t.active and s.followers>=t.min_followers and s.qv>=t.min_qualified_views_30d and (case when s.qv>0 then round(s.eng::numeric*10000/s.qv) else 0 end)>=t.min_engagement_bps order by t.rank desc limit 1),'starter') tier_slug
  from stats s
 )
 update public.creator_commercial_profiles c set tier_slug=r.tier_slug,updated_at=now() from ranked r where c.user_id=r.user_id and c.tier_slug is distinct from r.tier_slug;
 get diagnostics n=row_count; return n;
end; $$;
revoke all on function public.refresh_creator_tiers() from public,anon,authenticated;
grant execute on function public.refresh_creator_tiers() to authenticated;

create or replace function public.admin_calculate_creator_reward_period(p_start date,p_end date,p_funded_usd_micros bigint,p_creator_pool_bps integer default 5500) returns jsonb
language plpgsql security definer set search_path=public as $$
declare pid bigint; total_points numeric:=0; pool bigint; allocations integer:=0;
begin
 if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
 if p_end<p_start or p_funded_usd_micros<0 or p_creator_pool_bps not between 0 and 9000 then raise exception 'invalid_period'; end if;
 perform public.refresh_creator_tiers();
 select coalesce(sum(m.reward_points),0) into total_points from public.creator_content_metrics_daily m join public.creator_commercial_profiles c on c.user_id=m.user_id and c.program_status='active' and c.kyc_status='verified' and c.tax_status='verified' where m.metric_date between p_start and p_end;
 pool:=round(p_funded_usd_micros::numeric*p_creator_pool_bps/10000.0)::bigint;
 insert into public.creator_reward_periods(period_start,period_end,status,funded_usd_micros,creator_pool_bps,qualified_points,calculated_at) values(p_start,p_end,'calculated',p_funded_usd_micros,p_creator_pool_bps,total_points,now()) on conflict(period_start,period_end) do update set status='calculated',funded_usd_micros=excluded.funded_usd_micros,creator_pool_bps=excluded.creator_pool_bps,qualified_points=excluded.qualified_points,calculated_at=now() returning id into pid;
 delete from public.creator_reward_allocations where period_id=pid;
 if total_points>0 and pool>0 then
   with points as (select m.user_id,sum(m.reward_points) pts from public.creator_content_metrics_daily m join public.creator_commercial_profiles c on c.user_id=m.user_id and c.program_status='active' and c.kyc_status='verified' and c.tax_status='verified' where m.metric_date between p_start and p_end group by m.user_id), ins as (
    insert into public.creator_reward_allocations(period_id,user_id,qualified_points,allocation_usd_micros)
    select pid,p.user_id,p.pts,round(pool::numeric*p.pts/total_points)::bigint from points p returning *
   )
   insert into public.creator_commercial_ledger(user_id,source_type,source_reference,gross_usd_micros,platform_usd_micros,creator_usd_micros,reserve_usd_micros,status,hold_until,provider_slug,note)
   select i.user_id,'content_reward','reward-period:'||pid::text,p_funded_usd_micros-i.allocation_usd_micros,p_funded_usd_micros-i.allocation_usd_micros,i.allocation_usd_micros,round(i.allocation_usd_micros::numeric*coalesce(c.reserve_bps,1000)/10000.0)::bigint,'held',now()+make_interval(days=>coalesce(c.hold_days,21)),'exoclick','Creator Rewards allocation based on qualified views, watch time and authentic engagement.'
   from ins i join public.creator_commercial_profiles c on c.user_id=i.user_id
   on conflict(source_type,source_reference,user_id) do update set creator_usd_micros=excluded.creator_usd_micros,reserve_usd_micros=excluded.reserve_usd_micros,hold_until=excluded.hold_until,status='held',updated_at=now();
   get diagnostics allocations=row_count;
 end if;
 update public.creator_reward_allocations a set ledger_id=l.id from public.creator_commercial_ledger l where a.period_id=pid and l.user_id=a.user_id and l.source_type='content_reward' and l.source_reference='reward-period:'||pid::text;
 return jsonb_build_object('ok',true,'periodId',pid,'creatorPoolUsdMicros',pool,'qualifiedPoints',total_points,'allocations',allocations);
end; $$;
revoke all on function public.admin_calculate_creator_reward_period(date,date,bigint,integer) from public,anon,authenticated;
grant execute on function public.admin_calculate_creator_reward_period(date,date,bigint,integer) to authenticated;

create or replace function public.admin_review_creator_compliance(p_submission bigint,p_status text,p_note text default null,p_provider_reference text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s public.creator_compliance_submissions%rowtype;
begin
 if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
 if p_status not in ('verified','rejected','expired') then raise exception 'invalid_status'; end if;
 select * into s from public.creator_compliance_submissions where id=p_submission for update; if not found then raise exception 'not_found'; end if;
 update public.creator_compliance_submissions set status=p_status,review_note=p_note,provider_reference=coalesce(p_provider_reference,provider_reference),reviewed_by=auth.uid(),reviewed_at=now() where id=p_submission;
 if s.submission_type='kyc' then update public.creator_commercial_profiles set kyc_status=p_status,provider_partner_ref=coalesce(p_provider_reference,provider_partner_ref),updated_at=now() where user_id=s.user_id; end if;
 if s.submission_type='tax' then update public.creator_commercial_profiles set tax_status=p_status,updated_at=now() where user_id=s.user_id; end if;
 if s.submission_type='payout' then update public.creator_commercial_profiles set payout_status=case when p_status='verified' then 'ready' when p_status='rejected' then 'restricted' else 'not_ready' end,provider_partner_ref=coalesce(p_provider_reference,provider_partner_ref),updated_at=now() where user_id=s.user_id; end if;
 update public.creator_commercial_profiles set program_status=case when kyc_status='verified' and tax_status='verified' then 'active' else program_status end where user_id=s.user_id;
 return jsonb_build_object('ok',true,'userId',s.user_id,'status',p_status);
end; $$;
revoke all on function public.admin_review_creator_compliance(bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_review_creator_compliance(bigint,text,text,text) to authenticated;

create or replace function public.admin_review_advertiser(p_user uuid,p_status text,p_billing_status text default null,p_customer_ref text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
 if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
 if p_status not in ('approved','rejected','suspended','pending') then raise exception 'invalid_status'; end if;
 if p_billing_status is not null and p_billing_status not in ('not_configured','pending','ready','restricted') then raise exception 'invalid_billing'; end if;
 update public.advertiser_accounts set status=p_status,billing_status=coalesce(p_billing_status,billing_status),provider_customer_ref=coalesce(p_customer_ref,provider_customer_ref),updated_at=now() where user_id=p_user; if not found then raise exception 'not_found'; end if;
 return jsonb_build_object('ok',true,'status',p_status);
end; $$;
revoke all on function public.admin_review_advertiser(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_review_advertiser(uuid,text,text,text) to authenticated;

create or replace function public.create_brand_opportunity(p_title text,p_brief text,p_category text,p_compensation_type text,p_flat_fee_usd_micros bigint,p_revenue_share_bps integer,p_slots integer,p_requirements jsonb default '{}'::jsonb,p_starts_at timestamptz default null,p_ends_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); oid bigint;
begin
 if u is null then raise exception 'not_authenticated'; end if;
 if not exists(select 1 from public.advertiser_accounts a where a.user_id=u and a.status='approved' and a.billing_status='ready') then raise exception 'advertiser_not_ready'; end if;
 if p_compensation_type not in ('flat','revenue_share','hybrid') then raise exception 'invalid_compensation'; end if;
 insert into public.brand_opportunities(advertiser_user_id,title,brief,category,status,compensation_type,flat_fee_usd_micros,revenue_share_bps,slots,requirements,starts_at,ends_at) values(u,trim(p_title),trim(p_brief),nullif(trim(coalesce(p_category,'')),''),'open',p_compensation_type,greatest(coalesce(p_flat_fee_usd_micros,0),0),greatest(0,least(coalesce(p_revenue_share_bps,0),9000)),greatest(1,least(coalesce(p_slots,1),1000)),coalesce(p_requirements,'{}'::jsonb),p_starts_at,p_ends_at) returning id into oid;
 return jsonb_build_object('ok',true,'opportunityId',oid,'status','open');
end; $$;
revoke all on function public.create_brand_opportunity(text,text,text,text,bigint,integer,integer,jsonb,timestamptz,timestamptz) from public,anon;
grant execute on function public.create_brand_opportunity(text,text,text,text,bigint,integer,integer,jsonb,timestamptz,timestamptz) to authenticated;

create or replace function public.accept_brand_creator(p_opportunity bigint,p_creator uuid,p_gross_usd_micros bigint) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); fee_bps integer:=2000; creator_amount bigint; did bigint;
begin
 if u is null then raise exception 'not_authenticated'; end if;
 if not exists(select 1 from public.brand_opportunities o where o.id=p_opportunity and o.advertiser_user_id=u and o.status='open') then raise exception 'opportunity_unavailable'; end if;
 if not exists(select 1 from public.brand_opportunity_applications a where a.opportunity_id=p_opportunity and a.creator_user_id=p_creator and a.status in ('applied','shortlisted')) then raise exception 'creator_not_applicant'; end if;
 select t.marketplace_fee_bps into fee_bps from public.creator_commercial_profiles c join public.creator_tiers t on t.tier_slug=c.tier_slug where c.user_id=p_creator and c.program_status='active' and c.kyc_status='verified' and c.tax_status='verified'; if fee_bps is null then raise exception 'creator_not_commercial_ready'; end if;
 creator_amount:=round(p_gross_usd_micros::numeric*(10000-fee_bps)/10000.0)::bigint;
 insert into public.brand_deals(opportunity_id,advertiser_user_id,creator_user_id,status,gross_usd_micros,platform_fee_bps,creator_usd_micros,hold_until) values(p_opportunity,u,p_creator,'contracted',p_gross_usd_micros,fee_bps,creator_amount,now()+interval '30 days') returning id into did;
 update public.brand_opportunity_applications set status='accepted',updated_at=now() where opportunity_id=p_opportunity and creator_user_id=p_creator;
 return jsonb_build_object('ok',true,'dealId',did,'creatorUsdMicros',creator_amount,'platformFeeBps',fee_bps);
end; $$;
revoke all on function public.accept_brand_creator(bigint,uuid,bigint) from public,anon;
grant execute on function public.accept_brand_creator(bigint,uuid,bigint) to authenticated;
