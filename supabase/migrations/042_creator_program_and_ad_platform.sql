-- Creator program + direct/external ad configuration, creator revenue sharing and payout workflow.
-- Actual third-party network settlement remains provider-specific; this schema supports direct campaigns now
-- and stores safe public configuration references for external adapters without storing provider secrets.

alter table public.recommendation_suppressions drop constraint if exists recommendation_suppressions_pkey;
alter table public.recommendation_suppressions alter column item_type drop not null;
alter table public.recommendation_suppressions alter column item_id drop not null;
drop index if exists recommendation_suppressions_creator_unique;
create unique index recommendation_suppressions_creator_unique on public.recommendation_suppressions(user_id,creator_id) where suppression_type='creator';
drop index if exists recommendation_suppressions_item_unique;
create unique index recommendation_suppressions_item_unique on public.recommendation_suppressions(user_id,item_type,item_id) where suppression_type='item';

create table if not exists public.creator_applications(
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
  pitch text not null check(char_length(pitch) between 20 and 1500),
  categories text[] not null default '{}'::text[],
  review_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_profiles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  revenue_share_bps integer not null default 5000 check(revenue_share_bps between 0 and 9000),
  payout_min_usd_micros bigint not null default 25000000 check(payout_min_usd_micros>=0),
  approved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_networks(
  id bigint generated always as identity primary key,
  provider_slug text not null unique,
  display_name text not null,
  mode text not null default 'direct' check(mode in ('direct','external')),
  enabled boolean not null default false,
  public_config jsonb not null default '{}'::jsonb,
  secret_env_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ad_networks(provider_slug,display_name,mode,enabled,public_config)
values('citafuego_direct','CitaFuego Direct Ads','direct',true,'{}'::jsonb)
on conflict(provider_slug) do update set display_name=excluded.display_name,mode='direct',enabled=true,updated_at=now();

create table if not exists public.ad_placements(
  id bigint generated always as identity primary key,
  slug text not null unique,
  label text not null,
  surface text not null,
  enabled boolean not null default true,
  external_slot_key text,
  max_per_session integer not null default 3 check(max_per_session between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.ad_placements(slug,label,surface,max_per_session) values
 ('for_you_inline','Para ti · Inline','for_you',2),
 ('blog_detail_inline','Blog · Detalle','blog_detail',2),
 ('creator_profile_inline','Perfil de creador','creator_profile',2)
on conflict(slug) do update set label=excluded.label,surface=excluded.surface,updated_at=now();

create table if not exists public.ad_campaigns(
  id bigint generated always as identity primary key,
  network_id bigint not null references public.ad_networks(id) on delete restrict,
  advertiser_name text not null,
  name text not null,
  status text not null default 'draft' check(status in ('draft','active','paused','completed')),
  starts_at timestamptz,
  ends_at timestamptz,
  budget_usd_micros bigint not null default 0 check(budget_usd_micros>=0),
  cpm_usd_micros bigint not null default 0 check(cpm_usd_micros>=0),
  cpc_usd_micros bigint not null default 0 check(cpc_usd_micros>=0),
  destination_url text,
  targeting jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ad_campaigns_delivery_idx on public.ad_campaigns(status,starts_at,ends_at);

create table if not exists public.ad_campaign_placements(
  campaign_id bigint not null references public.ad_campaigns(id) on delete cascade,
  placement_id bigint not null references public.ad_placements(id) on delete cascade,
  primary key(campaign_id,placement_id)
);

create table if not exists public.ad_creatives(
  id bigint generated always as identity primary key,
  campaign_id bigint not null references public.ad_campaigns(id) on delete cascade,
  status text not null default 'active' check(status in ('active','paused','rejected')),
  headline text not null check(char_length(headline) between 1 and 120),
  body text check(body is null or char_length(body)<=500),
  image_url text,
  call_to_action text not null default 'Ver más' check(char_length(call_to_action)<=40),
  disclosure text not null default 'Publicidad' check(char_length(disclosure)<=40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_events(
  id bigint generated always as identity primary key,
  request_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  creator_context_id uuid references auth.users(id) on delete set null,
  placement_id bigint not null references public.ad_placements(id) on delete restrict,
  campaign_id bigint references public.ad_campaigns(id) on delete set null,
  creative_id bigint references public.ad_creatives(id) on delete set null,
  event_type text not null check(event_type in ('impression','click')),
  session_id text,
  gross_usd_micros bigint not null default 0 check(gross_usd_micros>=0),
  creator_usd_micros bigint not null default 0 check(creator_usd_micros>=0),
  occurred_at timestamptz not null default now(),
  unique(request_id,event_type)
);
create index if not exists ad_events_campaign_time_idx on public.ad_events(campaign_id,occurred_at desc);
create index if not exists ad_events_creator_time_idx on public.ad_events(creator_context_id,occurred_at desc) where creator_context_id is not null;

create table if not exists public.creator_earnings_ledger(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_event_id bigint unique references public.ad_events(id) on delete set null,
  source_type text not null check(source_type in ('ad_impression','ad_click','adjustment')),
  gross_usd_micros bigint not null default 0,
  creator_usd_micros bigint not null,
  status text not null default 'approved' check(status in ('estimated','approved','void')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists creator_earnings_user_time_idx on public.creator_earnings_ledger(user_id,created_at desc);

create table if not exists public.creator_payout_requests(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_usd_micros bigint not null check(amount_usd_micros>0),
  status text not null default 'pending' check(status in ('pending','approved','rejected','paid')),
  payout_method_label text,
  external_reference text,
  review_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists creator_payout_user_time_idx on public.creator_payout_requests(user_id,created_at desc);

alter table public.creator_applications enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.ad_networks enable row level security;
alter table public.ad_placements enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_campaign_placements enable row level security;
alter table public.ad_creatives enable row level security;
alter table public.ad_events enable row level security;
alter table public.creator_earnings_ledger enable row level security;
alter table public.creator_payout_requests enable row level security;

drop policy if exists creator_applications_self_read on public.creator_applications;
create policy creator_applications_self_read on public.creator_applications for select to authenticated using(user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance','analyst']));
drop policy if exists creator_profiles_self_read on public.creator_profiles;
create policy creator_profiles_self_read on public.creator_profiles for select to authenticated using(user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance','analyst']));
drop policy if exists ad_networks_public_enabled_read on public.ad_networks;
create policy ad_networks_public_enabled_read on public.ad_networks for select to authenticated using(enabled or public.admin_has_any_role(array['super_admin','finance','analyst']));
drop policy if exists ad_placements_public_enabled_read on public.ad_placements;
create policy ad_placements_public_enabled_read on public.ad_placements for select to authenticated using(enabled or public.admin_has_any_role(array['super_admin','finance','analyst']));
drop policy if exists ad_campaigns_admin_read on public.ad_campaigns;
create policy ad_campaigns_admin_read on public.ad_campaigns for select to authenticated using(public.admin_has_any_role(array['super_admin','finance','analyst']));
drop policy if exists ad_campaign_placements_admin_read on public.ad_campaign_placements;
create policy ad_campaign_placements_admin_read on public.ad_campaign_placements for select to authenticated using(public.admin_has_any_role(array['super_admin','finance','analyst']));
drop policy if exists ad_creatives_admin_read on public.ad_creatives;
create policy ad_creatives_admin_read on public.ad_creatives for select to authenticated using(public.admin_has_any_role(array['super_admin','finance','analyst']));
drop policy if exists ad_events_admin_or_creator_read on public.ad_events;
create policy ad_events_admin_or_creator_read on public.ad_events for select to authenticated using(creator_context_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance','analyst']));
drop policy if exists creator_earnings_self_read on public.creator_earnings_ledger;
create policy creator_earnings_self_read on public.creator_earnings_ledger for select to authenticated using(user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance','analyst']));
drop policy if exists creator_payout_self_read on public.creator_payout_requests;
create policy creator_payout_self_read on public.creator_payout_requests for select to authenticated using(user_id=auth.uid() or public.admin_has_any_role(array['super_admin','finance']));

grant select on public.creator_applications,public.creator_profiles,public.ad_networks,public.ad_placements,public.ad_campaigns,public.ad_campaign_placements,public.ad_creatives,public.ad_events,public.creator_earnings_ledger,public.creator_payout_requests to authenticated;
revoke insert,update,delete on public.creator_applications,public.creator_profiles,public.ad_networks,public.ad_placements,public.ad_campaigns,public.ad_campaign_placements,public.ad_creatives,public.ad_events,public.creator_earnings_ledger,public.creator_payout_requests from authenticated,anon;

create or replace function public.apply_creator_program(p_pitch text,p_categories text[] default '{}'::text[]) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); v_status text;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if length(trim(coalesce(p_pitch,'')))<20 or length(p_pitch)>1500 then raise exception 'invalid_pitch'; end if;
  if not exists(select 1 from public.profiles p where p.id=u and p.status='active') then raise exception 'profile_not_active'; end if;
  select status into v_status from public.creator_applications where user_id=u;
  if v_status in ('pending','approved') then raise exception 'application_already_active'; end if;
  insert into public.creator_applications(user_id,status,pitch,categories,created_at,updated_at)
  values(u,'pending',trim(p_pitch),coalesce(p_categories,'{}'::text[]),now(),now())
  on conflict(user_id) do update set status='pending',pitch=excluded.pitch,categories=excluded.categories,review_reason=null,reviewed_by=null,reviewed_at=null,updated_at=now();
  return jsonb_build_object('ok',true,'status','pending');
end; $$;
revoke all on function public.apply_creator_program(text,text[]) from public,anon;
grant execute on function public.apply_creator_program(text,text[]) to authenticated;

create or replace function public.get_creator_dashboard() returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); result jsonb; total bigint:=0; pending bigint:=0; paid bigint:=0; available bigint:=0;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  select coalesce(sum(creator_usd_micros) filter(where status='approved'),0) into total from public.creator_earnings_ledger where user_id=u;
  select coalesce(sum(amount_usd_micros) filter(where status in ('pending','approved')),0),coalesce(sum(amount_usd_micros) filter(where status='paid'),0) into pending,paid from public.creator_payout_requests where user_id=u;
  available:=greatest(total-pending-paid,0);
  select jsonb_build_object(
    'application',(select to_jsonb(a) from public.creator_applications a where a.user_id=u),
    'creator',(select to_jsonb(c) from public.creator_profiles c where c.user_id=u),
    'followers',(select count(*) from public.social_follows f where f.followed_id=u),
    'blogPosts',(select count(*) from public.blog_posts b where b.author_id=u and b.status='active'),
    'activeStories',(select count(*) from public.stories s where s.author_id=u and s.status='active' and s.expires_at>now()),
    'earnings',jsonb_build_object('approvedUsdMicros',total,'pendingPayoutUsdMicros',pending,'paidUsdMicros',paid,'availableUsdMicros',available),
    'recentLedger',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id,source_type,gross_usd_micros,creator_usd_micros,status,created_at from public.creator_earnings_ledger where user_id=u order by created_at desc limit 30) x),'[]'::jsonb),
    'payouts',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id,amount_usd_micros,status,payout_method_label,external_reference,review_reason,created_at,paid_at from public.creator_payout_requests where user_id=u order by created_at desc limit 20) x),'[]'::jsonb)
  ) into result;
  return result;
end; $$;
revoke all on function public.get_creator_dashboard() from public,anon;
grant execute on function public.get_creator_dashboard() to authenticated;

create or replace function public.request_creator_payout(p_amount_usd_micros bigint,p_method_label text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); total bigint:=0; reserved bigint:=0; paid bigint:=0; available bigint:=0; minimum bigint:=0; rid bigint;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  select payout_min_usd_micros into minimum from public.creator_profiles where user_id=u and active=true;
  if minimum is null then raise exception 'creator_not_active'; end if;
  select coalesce(sum(creator_usd_micros) filter(where status='approved'),0) into total from public.creator_earnings_ledger where user_id=u;
  select coalesce(sum(amount_usd_micros) filter(where status in ('pending','approved')),0),coalesce(sum(amount_usd_micros) filter(where status='paid'),0) into reserved,paid from public.creator_payout_requests where user_id=u;
  available:=greatest(total-reserved-paid,0);
  if p_amount_usd_micros<minimum then raise exception 'below_minimum'; end if;
  if p_amount_usd_micros>available then raise exception 'insufficient_available_balance'; end if;
  insert into public.creator_payout_requests(user_id,amount_usd_micros,payout_method_label) values(u,p_amount_usd_micros,nullif(trim(coalesce(p_method_label,'')),'')) returning id into rid;
  return jsonb_build_object('ok',true,'requestId',rid,'availableAfterUsdMicros',available-p_amount_usd_micros);
end; $$;
revoke all on function public.request_creator_payout(bigint,text) from public,anon;
grant execute on function public.request_creator_payout(bigint,text) to authenticated;

create or replace function public.admin_review_creator(p_user uuid,p_decision text,p_reason text default null,p_revenue_share_bps integer default 5000) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a uuid:=auth.uid();
begin
  if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
  if p_decision not in ('approved','rejected','suspended') then raise exception 'invalid_decision'; end if;
  if p_revenue_share_bps<0 or p_revenue_share_bps>9000 then raise exception 'invalid_revenue_share'; end if;
  update public.creator_applications set status=p_decision,review_reason=p_reason,reviewed_by=a,reviewed_at=now(),updated_at=now() where user_id=p_user;
  if not found then raise exception 'application_not_found'; end if;
  if p_decision='approved' then
    insert into public.creator_profiles(user_id,active,revenue_share_bps,approved_at,updated_at) values(p_user,true,p_revenue_share_bps,now(),now())
    on conflict(user_id) do update set active=true,revenue_share_bps=excluded.revenue_share_bps,updated_at=now();
  elsif p_decision='suspended' then update public.creator_profiles set active=false,updated_at=now() where user_id=p_user;
  elsif p_decision='rejected' then update public.creator_profiles set active=false,updated_at=now() where user_id=p_user;
  end if;
  return jsonb_build_object('ok',true,'status',p_decision);
end; $$;
revoke all on function public.admin_review_creator(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.admin_review_creator(uuid,text,text,integer) to authenticated;

create or replace function public.admin_review_creator_payout(p_request bigint,p_decision text,p_reason text default null,p_external_reference text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a uuid:=auth.uid();
begin
  if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
  if p_decision not in ('approved','rejected','paid') then raise exception 'invalid_decision'; end if;
  update public.creator_payout_requests set status=p_decision,review_reason=p_reason,external_reference=coalesce(nullif(trim(coalesce(p_external_reference,'')),''),external_reference),reviewed_by=a,reviewed_at=now(),paid_at=case when p_decision='paid' then now() else paid_at end where id=p_request and status in ('pending','approved');
  if not found then raise exception 'payout_not_found_or_final'; end if;
  return jsonb_build_object('ok',true,'status',p_decision);
end; $$;
revoke all on function public.admin_review_creator_payout(bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_review_creator_payout(bigint,text,text,text) to authenticated;

create or replace function public.get_ad_for_placement(p_placement text,p_creator_context uuid default null,p_request_id uuid default gen_random_uuid()) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); pl public.ad_placements%rowtype; c record; n record; spent bigint:=0;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  select * into pl from public.ad_placements where slug=p_placement and enabled=true;
  if not found then return null; end if;
  select ca.id campaign_id,cr.id creative_id,ca.advertiser_name,ca.name campaign_name,ca.destination_url,ca.cpm_usd_micros,ca.cpc_usd_micros,ca.budget_usd_micros,cr.headline,cr.body,cr.image_url,cr.call_to_action,cr.disclosure
  into c
  from public.ad_campaigns ca
  join public.ad_networks nw on nw.id=ca.network_id and nw.enabled=true and nw.mode='direct'
  join public.ad_campaign_placements cp on cp.campaign_id=ca.id and cp.placement_id=pl.id
  join public.ad_creatives cr on cr.campaign_id=ca.id and cr.status='active'
  where ca.status='active' and (ca.starts_at is null or ca.starts_at<=now()) and (ca.ends_at is null or ca.ends_at>now())
    and (ca.budget_usd_micros=0 or coalesce((select sum(e.gross_usd_micros) from public.ad_events e where e.campaign_id=ca.id),0)<ca.budget_usd_micros)
  order by md5(u::text||ca.id::text||current_date::text||p_request_id::text) limit 1;
  if found then
    return jsonb_build_object('kind','direct','requestId',p_request_id,'placementId',pl.id,'placement',pl.slug,'creatorContextId',p_creator_context,'campaignId',c.campaign_id,'creativeId',c.creative_id,'advertiser',c.advertiser_name,'headline',c.headline,'body',c.body,'imageUrl',c.image_url,'cta',c.call_to_action,'disclosure',c.disclosure,'destinationUrl',c.destination_url);
  end if;
  select nw.provider_slug,nw.display_name,nw.public_config into n from public.ad_networks nw where nw.enabled=true and nw.mode='external' order by nw.id limit 1;
  if found and pl.external_slot_key is not null then
    return jsonb_build_object('kind','external','requestId',p_request_id,'placementId',pl.id,'placement',pl.slug,'creatorContextId',p_creator_context,'provider',n.provider_slug,'providerName',n.display_name,'publicConfig',n.public_config,'slotKey',pl.external_slot_key);
  end if;
  return null;
end; $$;
revoke all on function public.get_ad_for_placement(text,uuid,uuid) from public,anon;
grant execute on function public.get_ad_for_placement(text,uuid,uuid) to authenticated;

create or replace function public.record_ad_event(p_request uuid,p_event text,p_placement bigint,p_campaign bigint,p_creative bigint,p_creator_context uuid default null,p_session_id text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); c public.ad_campaigns%rowtype; gross bigint:=0; share integer:=0; creator_amount bigint:=0; eid bigint;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if p_event not in ('impression','click') then raise exception 'invalid_event'; end if;
  if exists(select 1 from public.ad_events where request_id=p_request and event_type=p_event) then return jsonb_build_object('ok',true,'deduped',true); end if;
  select * into c from public.ad_campaigns where id=p_campaign and status in ('active','completed');
  if not found or not exists(select 1 from public.ad_creatives where id=p_creative and campaign_id=p_campaign) then raise exception 'invalid_ad'; end if;
  if not exists(select 1 from public.ad_campaign_placements where campaign_id=p_campaign and placement_id=p_placement) then raise exception 'invalid_placement'; end if;
  gross:=case when p_event='impression' then c.cpm_usd_micros/1000 else c.cpc_usd_micros end;
  if p_creator_context is not null then select revenue_share_bps into share from public.creator_profiles where user_id=p_creator_context and active=true; end if;
  creator_amount:=case when share is null then 0 else gross*share/10000 end;
  insert into public.ad_events(request_id,user_id,creator_context_id,placement_id,campaign_id,creative_id,event_type,session_id,gross_usd_micros,creator_usd_micros)
  values(p_request,u,p_creator_context,p_placement,p_campaign,p_creative,p_event,left(p_session_id,120),gross,creator_amount) returning id into eid;
  if creator_amount>0 then
    insert into public.creator_earnings_ledger(user_id,ad_event_id,source_type,gross_usd_micros,creator_usd_micros,status)
    values(p_creator_context,eid,case when p_event='impression' then 'ad_impression' else 'ad_click' end,gross,creator_amount,'approved');
  end if;
  return jsonb_build_object('ok',true,'grossUsdMicros',gross,'creatorUsdMicros',creator_amount);
end; $$;
revoke all on function public.record_ad_event(uuid,text,bigint,bigint,bigint,uuid,text) from public,anon;
grant execute on function public.record_ad_event(uuid,text,bigint,bigint,bigint,uuid,text) to authenticated;

create or replace function public.admin_get_monetization_metrics(p_days integer default 30) returns jsonb
language plpgsql security definer set search_path=public as $$
declare d integer:=least(greatest(coalesce(p_days,30),1),180); result jsonb;
begin
  if not public.admin_has_any_role(array['super_admin','finance','analyst']) then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'days',d,
    'activeCreators',(select count(*) from public.creator_profiles where active),
    'pendingCreatorApplications',(select count(*) from public.creator_applications where status='pending'),
    'pendingPayouts',(select count(*) from public.creator_payout_requests where status in ('pending','approved')),
    'impressions',(select count(*) from public.ad_events where event_type='impression' and occurred_at>=now()-make_interval(days=>d)),
    'clicks',(select count(*) from public.ad_events where event_type='click' and occurred_at>=now()-make_interval(days=>d)),
    'grossUsdMicros',coalesce((select sum(gross_usd_micros) from public.ad_events where occurred_at>=now()-make_interval(days=>d)),0),
    'creatorUsdMicros',coalesce((select sum(creator_usd_micros) from public.ad_events where occurred_at>=now()-make_interval(days=>d)),0),
    'campaigns',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'advertiser',c.advertiser_name,'status',c.status,'spendUsdMicros',coalesce((select sum(e.gross_usd_micros) from public.ad_events e where e.campaign_id=c.id),0)) order by c.created_at desc) from public.ad_campaigns c),'[]'::jsonb)
  ) into result;
  return result;
end; $$;
revoke all on function public.admin_get_monetization_metrics(integer) from public,anon,authenticated;
grant execute on function public.admin_get_monetization_metrics(integer) to authenticated;
