-- Public-style monetization eligibility policy inspired by TikTok's documented
-- Creator Rewards / TikTok One structure. Thresholds are configurable CitaFuego policy,
-- not a claim to reproduce TikTok's proprietary regional formulas.
create table if not exists public.creator_monetization_policy(
 policy_key text primary key,
 rewards_min_followers integer not null default 10000,
 rewards_min_qualified_views_30d integer not null default 100000,
 rewards_min_account_age_days integer not null default 30,
 rewards_min_content_count_30d integer not null default 3,
 marketplace_min_followers integer not null default 10000,
 marketplace_min_views_30d integer not null default 1000,
 marketplace_min_content_count_30d integer not null default 3,
 qualified_view_min_ms integer not null default 5000,
 creator_pool_bps integer not null default 5500,
 hold_days integer not null default 21,
 reserve_bps integer not null default 1000,
 updated_at timestamptz not null default now()
);
insert into public.creator_monetization_policy(policy_key) values('default') on conflict(policy_key) do nothing;
alter table public.creator_monetization_policy enable row level security;
create policy creator_policy_read on public.creator_monetization_policy for select to authenticated using(true);
grant select on public.creator_monetization_policy to authenticated;
revoke insert,update,delete on public.creator_monetization_policy from authenticated,anon;

create or replace function public.creator_rewards_eligible(p_user uuid) returns boolean
language sql stable security definer set search_path=public as $$
 with policy as(select * from public.creator_monetization_policy where policy_key='default'), stats as(
  select (select count(*) from public.social_follows f where f.followed_id=p_user) followers,
   (select coalesce(sum(m.qualified_views),0) from public.creator_content_metrics_daily m where m.user_id=p_user and m.metric_date>=current_date-29) qv,
   (select count(*) from public.blog_posts b where b.author_id=p_user and b.status='active' and b.published_at>=now()-interval '30 days')+(select count(*) from public.stories s where s.author_id=p_user and s.status='active' and s.created_at>=now()-interval '30 days') content_count,
   (select created_at from auth.users where id=p_user) account_created
 )
 select exists(select 1 from policy p,stats s,public.creator_commercial_profiles c,public.profiles pr where c.user_id=p_user and pr.id=p_user and pr.status='active' and c.program_status='active' and c.kyc_status='verified' and c.tax_status='verified' and s.followers>=p.rewards_min_followers and s.qv>=p.rewards_min_qualified_views_30d and s.content_count>=p.rewards_min_content_count_30d and s.account_created<=now()-make_interval(days=>p.rewards_min_account_age_days));
$$;
revoke all on function public.creator_rewards_eligible(uuid) from public,anon;
grant execute on function public.creator_rewards_eligible(uuid) to authenticated;

create or replace function public.creator_marketplace_eligible(p_user uuid) returns boolean
language sql stable security definer set search_path=public as $$
 with policy as(select * from public.creator_monetization_policy where policy_key='default'), stats as(
  select (select count(*) from public.social_follows f where f.followed_id=p_user) followers,
   (select coalesce(sum(m.qualified_views),0) from public.creator_content_metrics_daily m where m.user_id=p_user and m.metric_date>=current_date-29) qv,
   (select count(*) from public.blog_posts b where b.author_id=p_user and b.status='active' and b.published_at>=now()-interval '30 days')+(select count(*) from public.stories s where s.author_id=p_user and s.status='active' and s.created_at>=now()-interval '30 days') content_count
 )
 select exists(select 1 from policy p,stats s,public.creator_commercial_profiles c,public.profiles pr where c.user_id=p_user and pr.id=p_user and pr.status='active' and c.program_status='active' and c.kyc_status='verified' and c.tax_status='verified' and s.followers>=p.marketplace_min_followers and s.qv>=p.marketplace_min_views_30d and s.content_count>=p.marketplace_min_content_count_30d);
$$;
revoke all on function public.creator_marketplace_eligible(uuid) from public,anon;
grant execute on function public.creator_marketplace_eligible(uuid) to authenticated;

create or replace function public.admin_calculate_creator_reward_period(p_start date,p_end date,p_funded_usd_micros bigint,p_creator_pool_bps integer default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare pid bigint; total_points numeric:=0; pool bigint; allocations integer:=0; pool_bps integer;
begin
 if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
 select coalesce(p_creator_pool_bps,creator_pool_bps) into pool_bps from public.creator_monetization_policy where policy_key='default';
 if p_end<p_start or p_funded_usd_micros<0 or pool_bps not between 0 and 9000 then raise exception 'invalid_period'; end if;
 perform public.refresh_creator_tiers();
 select coalesce(sum(m.reward_points),0) into total_points from public.creator_content_metrics_daily m where m.metric_date between p_start and p_end and public.creator_rewards_eligible(m.user_id);
 pool:=round(p_funded_usd_micros::numeric*pool_bps/10000.0)::bigint;
 insert into public.creator_reward_periods(period_start,period_end,status,funded_usd_micros,creator_pool_bps,qualified_points,calculated_at) values(p_start,p_end,'calculated',p_funded_usd_micros,pool_bps,total_points,now()) on conflict(period_start,period_end) do update set status='calculated',funded_usd_micros=excluded.funded_usd_micros,creator_pool_bps=excluded.creator_pool_bps,qualified_points=excluded.qualified_points,calculated_at=now() returning id into pid;
 delete from public.creator_reward_allocations where period_id=pid;
 if total_points>0 and pool>0 then
   with points as(select m.user_id,sum(m.reward_points) pts from public.creator_content_metrics_daily m where m.metric_date between p_start and p_end and public.creator_rewards_eligible(m.user_id) group by m.user_id), ins as(
    insert into public.creator_reward_allocations(period_id,user_id,qualified_points,allocation_usd_micros) select pid,p.user_id,p.pts,round(pool::numeric*p.pts/total_points)::bigint from points p returning *
   )
   insert into public.creator_commercial_ledger(user_id,source_type,source_reference,gross_usd_micros,platform_usd_micros,creator_usd_micros,reserve_usd_micros,status,hold_until,provider_slug,note)
   select i.user_id,'content_reward','reward-period:'||pid::text,p_funded_usd_micros-i.allocation_usd_micros,p_funded_usd_micros-i.allocation_usd_micros,i.allocation_usd_micros,round(i.allocation_usd_micros::numeric*coalesce(c.reserve_bps,1000)/10000.0)::bigint,'held',now()+make_interval(days=>coalesce(c.hold_days,21)),'exoclick','Creator Rewards allocation after eligibility, qualified-view and anti-fraud controls.'
   from ins i join public.creator_commercial_profiles c on c.user_id=i.user_id on conflict(source_type,source_reference,user_id) do update set creator_usd_micros=excluded.creator_usd_micros,reserve_usd_micros=excluded.reserve_usd_micros,hold_until=excluded.hold_until,status='held',updated_at=now();
   get diagnostics allocations=row_count;
 end if;
 update public.creator_reward_allocations a set ledger_id=l.id from public.creator_commercial_ledger l where a.period_id=pid and l.user_id=a.user_id and l.source_type='content_reward' and l.source_reference='reward-period:'||pid::text;
 return jsonb_build_object('ok',true,'periodId',pid,'creatorPoolUsdMicros',pool,'creatorPoolBps',pool_bps,'qualifiedPoints',total_points,'allocations',allocations);
end; $$;
revoke all on function public.admin_calculate_creator_reward_period(date,date,bigint,integer) from public,anon,authenticated;
grant execute on function public.admin_calculate_creator_reward_period(date,date,bigint,integer) to authenticated;

create or replace function public.apply_brand_opportunity(p_opportunity bigint,p_pitch text default null,p_proposed_fee_usd_micros bigint default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'not_authenticated'; end if;
 if not public.creator_marketplace_eligible(u) then raise exception 'creator_not_marketplace_eligible'; end if;
 if not exists(select 1 from public.brand_opportunities o where o.id=p_opportunity and o.status='open' and (o.starts_at is null or o.starts_at<=now()) and (o.ends_at is null or o.ends_at>=now())) then raise exception 'opportunity_unavailable'; end if;
 insert into public.brand_opportunity_applications(opportunity_id,creator_user_id,pitch,proposed_fee_usd_micros,status) values(p_opportunity,u,nullif(trim(coalesce(p_pitch,'')),''),p_proposed_fee_usd_micros,'applied') on conflict(opportunity_id,creator_user_id) do update set pitch=excluded.pitch,proposed_fee_usd_micros=excluded.proposed_fee_usd_micros,status='applied',updated_at=now();
 return jsonb_build_object('ok',true,'status','applied');
end; $$;
revoke all on function public.apply_brand_opportunity(bigint,text,bigint) from public,anon;
grant execute on function public.apply_brand_opportunity(bigint,text,bigint) to authenticated;
