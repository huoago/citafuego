-- Commercialization V2: creator rewards, tiers, brand marketplace, advertiser self-service,
-- KYC/tax state, anti-fraud, settlement holds and reversal accounting.
-- The design follows public creator-economy patterns (qualified views, engagement,
-- marketplace deals, payout review) without claiming to reproduce proprietary TikTok formulas.

create table if not exists public.commercialization_providers(
  provider_slug text primary key,
  display_name text not null,
  provider_kind text not null check(provider_kind in ('ad_supply','payment_payout')),
  status text not null default 'pending_credentials' check(status in ('pending_credentials','pending_provider_approval','sandbox','live','suspended')),
  public_config jsonb not null default '{}'::jsonb,
  secret_env_refs text[] not null default '{}'::text[],
  account_reference text,
  notes text,
  updated_at timestamptz not null default now()
);
insert into public.commercialization_providers(provider_slug,display_name,provider_kind,status,public_config,secret_env_refs,notes) values
('exoclick','ExoClick','ad_supply','pending_credentials',jsonb_build_object('apiBase','https://api.exoclick.com/v2','role','publisher','integration','Public API v2 / publisher statistics and approved zones'),array['EXOCLICK_API_TOKEN'],'Real external ad supplier. Live serving requires an approved ExoClick publisher account and zones.'),
('segpay','Segpay','payment_payout','pending_credentials',jsonb_build_object('docs','Segpay Processing API + Partner Payout','postbackPath','/api/providers/segpay/postback'),array['SEGPAY_SRS_USER_ID','SEGPAY_SRS_ACCESS_KEY','SEGPAY_BASE_URL','SEGPAY_POSTBACK_SECRET'],'Real high-risk/dating processor. Partner Payout requires Segpay approval.')
on conflict(provider_slug) do update set display_name=excluded.display_name,provider_kind=excluded.provider_kind,public_config=excluded.public_config,secret_env_refs=excluded.secret_env_refs,notes=excluded.notes,updated_at=now();

create table if not exists public.creator_tiers(
  tier_slug text primary key,
  label text not null,
  rank smallint not null unique,
  min_followers integer not null default 0,
  min_qualified_views_30d integer not null default 0,
  min_engagement_bps integer not null default 0,
  ad_share_bps integer not null check(ad_share_bps between 0 and 9000),
  reward_multiplier_bps integer not null default 10000 check(reward_multiplier_bps between 5000 and 20000),
  marketplace_fee_bps integer not null default 2000 check(marketplace_fee_bps between 0 and 5000),
  active boolean not null default true
);
insert into public.creator_tiers(tier_slug,label,rank,min_followers,min_qualified_views_30d,min_engagement_bps,ad_share_bps,reward_multiplier_bps,marketplace_fee_bps) values
('starter','Starter',1,0,0,0,4500,10000,2000),
('rising','Rising',2,1000,10000,250,5000,10500,1900),
('pro','Pro',3,10000,100000,350,5500,11500,1700),
('elite','Elite',4,50000,500000,450,6000,12500,1500)
on conflict(tier_slug) do update set label=excluded.label,rank=excluded.rank,min_followers=excluded.min_followers,min_qualified_views_30d=excluded.min_qualified_views_30d,min_engagement_bps=excluded.min_engagement_bps,ad_share_bps=excluded.ad_share_bps,reward_multiplier_bps=excluded.reward_multiplier_bps,marketplace_fee_bps=excluded.marketplace_fee_bps,active=true;

create table if not exists public.creator_commercial_profiles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier_slug text not null default 'starter' references public.creator_tiers(tier_slug),
  program_status text not null default 'pending' check(program_status in ('pending','active','paused','suspended','closed')),
  kyc_status text not null default 'not_submitted' check(kyc_status in ('not_submitted','pending','verified','rejected','expired')),
  tax_status text not null default 'not_submitted' check(tax_status in ('not_submitted','pending','verified','rejected','expired')),
  payout_status text not null default 'not_ready' check(payout_status in ('not_ready','pending_provider','ready','restricted')),
  country_code text,
  legal_name text,
  tax_classification text,
  tax_form_type text,
  provider_slug text references public.commercialization_providers(provider_slug),
  provider_partner_ref text,
  hold_days integer not null default 21 check(hold_days between 0 and 120),
  reserve_bps integer not null default 1000 check(reserve_bps between 0 and 5000),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_compliance_submissions(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_type text not null check(submission_type in ('kyc','tax','payout')),
  provider_slug text references public.commercialization_providers(provider_slug),
  provider_reference text,
  status text not null default 'pending' check(status in ('pending','verified','rejected','expired')),
  country_code text,
  declaration jsonb not null default '{}'::jsonb,
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists creator_compliance_user_idx on public.creator_compliance_submissions(user_id,created_at desc);

create table if not exists public.creator_content_metrics_daily(
  metric_date date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  qualified_views bigint not null default 0,
  filtered_views bigint not null default 0,
  qualified_watch_ms bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  saves bigint not null default 0,
  shares bigint not null default 0,
  follows_generated bigint not null default 0,
  reward_points numeric(18,6) not null default 0,
  primary key(metric_date,user_id)
);
create index if not exists creator_metrics_user_date_idx on public.creator_content_metrics_daily(user_id,metric_date desc);

create table if not exists public.creator_reward_periods(
  id bigint generated always as identity primary key,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check(status in ('draft','calculated','locked','released','cancelled')),
  funded_usd_micros bigint not null default 0,
  creator_pool_bps integer not null default 5500 check(creator_pool_bps between 0 and 9000),
  qualified_points numeric(24,6) not null default 0,
  calculated_at timestamptz,
  released_at timestamptz,
  unique(period_start,period_end),
  check(period_end>=period_start)
);

create table if not exists public.creator_commercial_ledger(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check(source_type in ('ad_share','content_reward','brand_deal','manual_adjustment','refund_reversal','chargeback_reversal','reserve_release')),
  source_reference text,
  gross_usd_micros bigint not null default 0,
  platform_usd_micros bigint not null default 0,
  creator_usd_micros bigint not null,
  reserve_usd_micros bigint not null default 0,
  status text not null default 'held' check(status in ('held','available','reserved','paid','reversed','void')),
  hold_until timestamptz,
  provider_slug text references public.commercialization_providers(provider_slug),
  provider_transaction_ref text,
  reversal_of bigint references public.creator_commercial_ledger(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_type,source_reference,user_id)
);
create index if not exists commercial_ledger_user_status_idx on public.creator_commercial_ledger(user_id,status,hold_until);
create index if not exists commercial_ledger_provider_ref_idx on public.creator_commercial_ledger(provider_slug,provider_transaction_ref) where provider_transaction_ref is not null;

create table if not exists public.creator_reward_allocations(
  period_id bigint not null references public.creator_reward_periods(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  qualified_points numeric(24,6) not null,
  allocation_usd_micros bigint not null,
  ledger_id bigint references public.creator_commercial_ledger(id) on delete set null,
  primary key(period_id,user_id)
);

create table if not exists public.commercial_fraud_events(
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  creator_id uuid references auth.users(id) on delete set null,
  source text not null,
  rule_code text not null,
  risk_score integer not null check(risk_score between 0 and 100),
  action text not null default 'observe' check(action in ('observe','filter','hold','block')),
  metadata jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists commercial_fraud_creator_idx on public.commercial_fraud_events(creator_id,created_at desc);

create table if not exists public.advertiser_accounts(
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null,
  website_url text,
  country_code text,
  status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
  billing_status text not null default 'not_configured' check(billing_status in ('not_configured','pending','ready','restricted')),
  provider_customer_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.self_service_ad_campaigns(
  id bigint generated always as identity primary key,
  advertiser_user_id uuid not null references public.advertiser_accounts(user_id) on delete cascade,
  name text not null,
  objective text not null check(objective in ('awareness','traffic','engagement','conversions')),
  status text not null default 'draft' check(status in ('draft','submitted','approved','rejected','active','paused','completed')),
  budget_usd_micros bigint not null check(budget_usd_micros>0),
  daily_budget_usd_micros bigint not null default 0,
  destination_url text not null,
  headline text not null,
  body text,
  image_url text,
  placement_slugs text[] not null default array['for_you_inline']::text[],
  targeting jsonb not null default '{}'::jsonb,
  review_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists self_service_campaign_advertiser_idx on public.self_service_ad_campaigns(advertiser_user_id,created_at desc);

create table if not exists public.brand_opportunities(
  id bigint generated always as identity primary key,
  advertiser_user_id uuid not null references public.advertiser_accounts(user_id) on delete cascade,
  title text not null,
  brief text not null,
  category text,
  status text not null default 'draft' check(status in ('draft','open','paused','closed','cancelled')),
  compensation_type text not null check(compensation_type in ('flat','revenue_share','hybrid')),
  flat_fee_usd_micros bigint not null default 0,
  revenue_share_bps integer not null default 0 check(revenue_share_bps between 0 and 9000),
  slots integer not null default 1 check(slots between 1 and 1000),
  requirements jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_opportunity_applications(
  opportunity_id bigint not null references public.brand_opportunities(id) on delete cascade,
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  pitch text,
  proposed_fee_usd_micros bigint,
  status text not null default 'applied' check(status in ('applied','shortlisted','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(opportunity_id,creator_user_id)
);

create table if not exists public.brand_deals(
  id bigint generated always as identity primary key,
  opportunity_id bigint not null references public.brand_opportunities(id) on delete restrict,
  advertiser_user_id uuid not null references public.advertiser_accounts(user_id) on delete restrict,
  creator_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'contracted' check(status in ('contracted','in_production','submitted','approved','published','settling','paid','cancelled','disputed')),
  gross_usd_micros bigint not null,
  platform_fee_bps integer not null default 2000 check(platform_fee_bps between 0 and 5000),
  creator_usd_micros bigint not null,
  hold_until timestamptz,
  provider_transaction_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.creator_payout_requests add column if not exists provider_slug text references public.commercialization_providers(provider_slug);
alter table public.creator_payout_requests add column if not exists provider_payout_ref text;
alter table public.creator_payout_requests add column if not exists payout_fee_usd_micros bigint not null default 0;
alter table public.creator_payout_requests add column if not exists net_usd_micros bigint;
alter table public.creator_payout_requests add column if not exists failure_reason text;

alter table public.commercialization_providers enable row level security;
alter table public.creator_tiers enable row level security;
alter table public.creator_commercial_profiles enable row level security;
alter table public.creator_compliance_submissions enable row level security;
alter table public.creator_content_metrics_daily enable row level security;
alter table public.creator_reward_periods enable row level security;
alter table public.creator_commercial_ledger enable row level security;
alter table public.creator_reward_allocations enable row level security;
alter table public.commercial_fraud_events enable row level security;
alter table public.advertiser_accounts enable row level security;
alter table public.self_service_ad_campaigns enable row level security;
alter table public.brand_opportunities enable row level security;
alter table public.brand_opportunity_applications enable row level security;
alter table public.brand_deals enable row level security;

create policy creator_tiers_read on public.creator_tiers for select to authenticated using(active or public.admin_has_any_role(array['super_admin','finance','analyst']));
create policy commercial_creator_self on public.creator_commercial_profiles for select to authenticated using(user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance','analyst']));
create policy compliance_creator_self on public.creator_compliance_submissions for select to authenticated using(user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance']));
create policy creator_metrics_self on public.creator_content_metrics_daily for select to authenticated using(user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance','analyst']));
create policy creator_ledger_self on public.creator_commercial_ledger for select to authenticated using(user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance','analyst']));
create policy creator_alloc_self on public.creator_reward_allocations for select to authenticated using(user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance','analyst']));
create policy advertiser_self on public.advertiser_accounts for select to authenticated using(user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance','analyst']));
create policy campaign_self on public.self_service_ad_campaigns for select to authenticated using(advertiser_user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance','analyst']));
create policy brand_open_or_owner on public.brand_opportunities for select to authenticated using(status='open' or advertiser_user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance','analyst']));
create policy brand_app_participants on public.brand_opportunity_applications for select to authenticated using(creator_user_id=auth.uid() or exists(select 1 from public.brand_opportunities o where o.id=opportunity_id and o.advertiser_user_id=auth.uid()) or public.admin_has_any_role(array['super_admin','finance','analyst']));
create policy brand_deal_participants on public.brand_deals for select to authenticated using(creator_user_id=auth.uid() or advertiser_user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance','analyst']));
create policy provider_admin_read on public.commercialization_providers for select to authenticated using(public.admin_has_any_role(array['super_admin','finance','analyst']));
create policy reward_period_admin_read on public.creator_reward_periods for select to authenticated using(public.admin_has_any_role(array['super_admin','finance','analyst']));
create policy fraud_admin_read on public.commercial_fraud_events for select to authenticated using(public.admin_has_any_role(array['super_admin','finance','analyst','trust_safety']));

grant select on public.commercialization_providers,public.creator_tiers,public.creator_commercial_profiles,public.creator_compliance_submissions,public.creator_content_metrics_daily,public.creator_reward_periods,public.creator_commercial_ledger,public.creator_reward_allocations,public.commercial_fraud_events,public.advertiser_accounts,public.self_service_ad_campaigns,public.brand_opportunities,public.brand_opportunity_applications,public.brand_deals to authenticated;
revoke insert,update,delete on public.commercialization_providers,public.creator_tiers,public.creator_commercial_profiles,public.creator_compliance_submissions,public.creator_content_metrics_daily,public.creator_reward_periods,public.creator_commercial_ledger,public.creator_reward_allocations,public.commercial_fraud_events,public.advertiser_accounts,public.self_service_ad_campaigns,public.brand_opportunities,public.brand_opportunity_applications,public.brand_deals from authenticated,anon;

create or replace function public.submit_creator_compliance(p_type text,p_country text,p_declaration jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); sid bigint;
begin
 if u is null then raise exception 'not_authenticated'; end if;
 if p_type not in ('kyc','tax','payout') then raise exception 'invalid_submission_type'; end if;
 if not exists(select 1 from public.creator_profiles c where c.user_id=u and c.active=true) then raise exception 'creator_not_active'; end if;
 insert into public.creator_commercial_profiles(user_id,program_status,country_code,provider_slug) values(u,'pending',upper(left(coalesce(p_country,''),2)),'segpay') on conflict(user_id) do update set country_code=excluded.country_code,updated_at=now();
 insert into public.creator_compliance_submissions(user_id,submission_type,provider_slug,status,country_code,declaration) values(u,p_type,'segpay','pending',upper(left(coalesce(p_country,''),2)),coalesce(p_declaration,'{}'::jsonb)) returning id into sid;
 if p_type='kyc' then update public.creator_commercial_profiles set kyc_status='pending',updated_at=now() where user_id=u; end if;
 if p_type='tax' then update public.creator_commercial_profiles set tax_status='pending',updated_at=now() where user_id=u; end if;
 if p_type='payout' then update public.creator_commercial_profiles set payout_status='pending_provider',updated_at=now() where user_id=u; end if;
 return jsonb_build_object('ok',true,'submissionId',sid,'status','pending');
end; $$;
revoke all on function public.submit_creator_compliance(text,text,jsonb) from public,anon;
grant execute on function public.submit_creator_compliance(text,text,jsonb) to authenticated;

create or replace function public.get_commercial_creator_dashboard() returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); v jsonb; held bigint:=0; available bigint:=0; paid bigint:=0; reversed bigint:=0;
begin
 if u is null then raise exception 'not_authenticated'; end if;
 select coalesce(sum(creator_usd_micros) filter(where status='held'),0),coalesce(sum(creator_usd_micros) filter(where status='available'),0),coalesce(sum(creator_usd_micros) filter(where status='paid'),0),coalesce(sum(abs(creator_usd_micros)) filter(where status='reversed'),0) into held,available,paid,reversed from public.creator_commercial_ledger where user_id=u;
 select jsonb_build_object(
  'commercialProfile',(select to_jsonb(c) from public.creator_commercial_profiles c where c.user_id=u),
  'tier',(select to_jsonb(t) from public.creator_tiers t join public.creator_commercial_profiles c on c.tier_slug=t.tier_slug where c.user_id=u),
  'balances',jsonb_build_object('heldUsdMicros',held,'availableUsdMicros',available,'paidUsdMicros',paid,'reversedUsdMicros',reversed),
  'metrics30d',(select jsonb_build_object('qualifiedViews',coalesce(sum(m.qualified_views),0),'filteredViews',coalesce(sum(m.filtered_views),0),'watchMs',coalesce(sum(m.qualified_watch_ms),0),'engagements',coalesce(sum(m.likes+m.comments+m.saves+m.shares),0),'rewardPoints',coalesce(sum(m.reward_points),0)) from public.creator_content_metrics_daily m where m.user_id=u and m.metric_date>=current_date-29),
  'recentLedger',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id,source_type,gross_usd_micros,platform_usd_micros,creator_usd_micros,reserve_usd_micros,status,hold_until,provider_slug,note,created_at from public.creator_commercial_ledger where user_id=u order by created_at desc limit 40)x),'[]'::jsonb),
  'brandApplications',coalesce((select jsonb_agg(jsonb_build_object('opportunityId',a.opportunity_id,'status',a.status,'title',o.title,'compensationType',o.compensation_type,'flatFeeUsdMicros',o.flat_fee_usd_micros) order by a.created_at desc) from public.brand_opportunity_applications a join public.brand_opportunities o on o.id=a.opportunity_id where a.creator_user_id=u),'[]'::jsonb)
 ) into v;
 return v;
end; $$;
revoke all on function public.get_commercial_creator_dashboard() from public,anon;
grant execute on function public.get_commercial_creator_dashboard() to authenticated;

create or replace function public.apply_brand_opportunity(p_opportunity bigint,p_pitch text default null,p_proposed_fee_usd_micros bigint default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'not_authenticated'; end if;
 if not exists(select 1 from public.creator_commercial_profiles c where c.user_id=u and c.program_status='active' and c.kyc_status='verified' and c.tax_status='verified') then raise exception 'creator_not_commercial_ready'; end if;
 if not exists(select 1 from public.brand_opportunities o where o.id=p_opportunity and o.status='open' and (o.starts_at is null or o.starts_at<=now()) and (o.ends_at is null or o.ends_at>=now())) then raise exception 'opportunity_unavailable'; end if;
 insert into public.brand_opportunity_applications(opportunity_id,creator_user_id,pitch,proposed_fee_usd_micros,status) values(p_opportunity,u,nullif(trim(coalesce(p_pitch,'')),''),p_proposed_fee_usd_micros,'applied') on conflict(opportunity_id,creator_user_id) do update set pitch=excluded.pitch,proposed_fee_usd_micros=excluded.proposed_fee_usd_micros,status='applied',updated_at=now();
 return jsonb_build_object('ok',true,'status','applied');
end; $$;
revoke all on function public.apply_brand_opportunity(bigint,text,bigint) from public,anon;
grant execute on function public.apply_brand_opportunity(bigint,text,bigint) to authenticated;

create or replace function public.register_advertiser(p_business_name text,p_website_url text,p_country_code text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'not_authenticated'; end if;
 if length(trim(coalesce(p_business_name,'')))<2 then raise exception 'invalid_business_name'; end if;
 insert into public.advertiser_accounts(user_id,business_name,website_url,country_code,status) values(u,trim(p_business_name),nullif(trim(coalesce(p_website_url,'')),''),upper(left(coalesce(p_country_code,''),2)),'pending') on conflict(user_id) do update set business_name=excluded.business_name,website_url=excluded.website_url,country_code=excluded.country_code,updated_at=now();
 return jsonb_build_object('ok',true,'status','pending');
end; $$;
revoke all on function public.register_advertiser(text,text,text) from public,anon;
grant execute on function public.register_advertiser(text,text,text) to authenticated;

create or replace function public.submit_self_service_campaign(p_name text,p_objective text,p_budget_usd_micros bigint,p_daily_budget_usd_micros bigint,p_destination_url text,p_headline text,p_body text,p_image_url text,p_placements text[],p_targeting jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); cid bigint;
begin
 if u is null then raise exception 'not_authenticated'; end if;
 if not exists(select 1 from public.advertiser_accounts a where a.user_id=u and a.status='approved' and a.billing_status='ready') then raise exception 'advertiser_not_ready'; end if;
 if p_objective not in ('awareness','traffic','engagement','conversions') or p_budget_usd_micros<10000000 then raise exception 'invalid_campaign'; end if;
 insert into public.self_service_ad_campaigns(advertiser_user_id,name,objective,status,budget_usd_micros,daily_budget_usd_micros,destination_url,headline,body,image_url,placement_slugs,targeting) values(u,trim(p_name),p_objective,'submitted',p_budget_usd_micros,greatest(coalesce(p_daily_budget_usd_micros,0),0),trim(p_destination_url),trim(p_headline),nullif(trim(coalesce(p_body,'')),''),nullif(trim(coalesce(p_image_url,'')),''),coalesce(p_placements,array['for_you_inline']::text[]),coalesce(p_targeting,'{}'::jsonb)) returning id into cid;
 return jsonb_build_object('ok',true,'campaignId',cid,'status','submitted');
end; $$;
revoke all on function public.submit_self_service_campaign(text,text,bigint,bigint,text,text,text,text,text[],jsonb) from public,anon;
grant execute on function public.submit_self_service_campaign(text,text,bigint,bigint,text,text,text,text,text[],jsonb) to authenticated;

create or replace function public.release_mature_creator_earnings() returns integer
language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
 update public.creator_commercial_ledger l set status='available',updated_at=now() where l.status='held' and coalesce(l.hold_until,now())<=now() and not exists(select 1 from public.commercial_fraud_events f where f.creator_id=l.user_id and f.resolved=false and f.action in ('hold','block') and f.created_at>=l.created_at);
 get diagnostics n=row_count; return n;
end; $$;
revoke all on function public.release_mature_creator_earnings() from public,anon,authenticated;
grant execute on function public.release_mature_creator_earnings() to authenticated;

create or replace function public.reverse_creator_revenue(p_provider text,p_transaction_ref text,p_reason text,p_chargeback boolean default false) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r public.creator_commercial_ledger%rowtype; nid bigint;
begin
 if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
 select * into r from public.creator_commercial_ledger where provider_slug=p_provider and provider_transaction_ref=p_transaction_ref and status not in ('reversed','void') order by created_at desc limit 1 for update;
 if not found then raise exception 'transaction_not_found'; end if;
 update public.creator_commercial_ledger set status='reversed',updated_at=now(),note=coalesce(note,'')||' | reversed: '||coalesce(p_reason,'provider reversal') where id=r.id;
 insert into public.creator_commercial_ledger(user_id,source_type,source_reference,gross_usd_micros,platform_usd_micros,creator_usd_micros,reserve_usd_micros,status,provider_slug,provider_transaction_ref,reversal_of,note) values(r.user_id,case when p_chargeback then 'chargeback_reversal' else 'refund_reversal' end,'reversal:'||r.id::text,-r.gross_usd_micros,-r.platform_usd_micros,-r.creator_usd_micros,-r.reserve_usd_micros,'reversed',r.provider_slug,r.provider_transaction_ref,r.id,p_reason) returning id into nid;
 return jsonb_build_object('ok',true,'reversalLedgerId',nid);
end; $$;
revoke all on function public.reverse_creator_revenue(text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.reverse_creator_revenue(text,text,text,boolean) to authenticated;

create or replace function public.admin_get_commercialization_dashboard(p_days integer default 30) returns jsonb
language plpgsql security definer set search_path=public as $$
declare d integer:=least(greatest(coalesce(p_days,30),1),365);
begin
 if not public.admin_has_any_role(array['super_admin','finance','analyst']) then raise exception 'forbidden'; end if;
 return jsonb_build_object(
 'providers',coalesce((select jsonb_agg(to_jsonb(p) order by p.provider_slug) from public.commercialization_providers p),'[]'::jsonb),
 'creators',jsonb_build_object('active',(select count(*) from public.creator_commercial_profiles where program_status='active'),'kycPending',(select count(*) from public.creator_commercial_profiles where kyc_status='pending'),'taxPending',(select count(*) from public.creator_commercial_profiles where tax_status='pending')),
 'ledger',jsonb_build_object('heldUsdMicros',(select coalesce(sum(creator_usd_micros),0) from public.creator_commercial_ledger where status='held'),'availableUsdMicros',(select coalesce(sum(creator_usd_micros),0) from public.creator_commercial_ledger where status='available'),'paidUsdMicros',(select coalesce(sum(creator_usd_micros),0) from public.creator_commercial_ledger where status='paid'),'reversedUsdMicros',(select coalesce(sum(abs(creator_usd_micros)),0) from public.creator_commercial_ledger where status='reversed')),
 'fraud',jsonb_build_object('open',(select count(*) from public.commercial_fraud_events where resolved=false),'held',(select count(*) from public.commercial_fraud_events where resolved=false and action='hold'),'blocked',(select count(*) from public.commercial_fraud_events where resolved=false and action='block')),
 'advertisers',jsonb_build_object('pending',(select count(*) from public.advertiser_accounts where status='pending'),'approved',(select count(*) from public.advertiser_accounts where status='approved'),'campaignsSubmitted',(select count(*) from public.self_service_ad_campaigns where status='submitted')),
 'brands',jsonb_build_object('openOpportunities',(select count(*) from public.brand_opportunities where status='open'),'activeDeals',(select count(*) from public.brand_deals where status not in ('paid','cancelled'))),
 'periodDays',d
 );
end; $$;
revoke all on function public.admin_get_commercialization_dashboard(integer) from public,anon,authenticated;
grant execute on function public.admin_get_commercialization_dashboard(integer) to authenticated;
