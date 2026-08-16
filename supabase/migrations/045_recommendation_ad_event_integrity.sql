-- Integrity hardening for Recommendation V3 and creator monetization.
-- Never trust client-supplied creator attribution for recommendation signals, and bind
-- direct ad events to a short-lived server-issued delivery request before recording revenue.

create table if not exists public.ad_delivery_requests(
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  creator_context_id uuid references auth.users(id) on delete set null,
  placement_id bigint not null references public.ad_placements(id) on delete restrict,
  campaign_id bigint not null references public.ad_campaigns(id) on delete cascade,
  creative_id bigint not null references public.ad_creatives(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '20 minutes')
);
create index if not exists ad_delivery_requests_user_placement_idx on public.ad_delivery_requests(user_id,placement_id,created_at desc);
create index if not exists ad_delivery_requests_expiry_idx on public.ad_delivery_requests(expires_at);
alter table public.ad_delivery_requests enable row level security;
revoke all on public.ad_delivery_requests from anon,authenticated;

create or replace function public.record_recommendation_feedback(
  p_event text,p_item_type text,p_item_id uuid,p_creator uuid,p_dwell_ms integer default null,p_session_id text default null,p_position integer default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); v_variant text; v_target uuid;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if p_event not in ('impression','click','dwell','not_interested','hide_author') then raise exception 'invalid_event'; end if;
  if p_item_type not in ('profile','blog','story') then raise exception 'invalid_item_type'; end if;
  if p_dwell_ms is not null and (p_dwell_ms<0 or p_dwell_ms>3600000) then raise exception 'invalid_dwell'; end if;

  if p_item_type='profile' then
    v_target:=p_item_id;
    if not public.can_view_social_profile(p_item_id,u) then raise exception 'item_unavailable'; end if;
  elsif p_item_type='blog' then
    if not public.can_view_blog_post(p_item_id,u) then raise exception 'item_unavailable'; end if;
    select author_id into v_target from public.blog_posts where id=p_item_id and status='active';
  else
    if not public.can_view_story(p_item_id,u) then raise exception 'item_unavailable'; end if;
    select author_id into v_target from public.stories where id=p_item_id and status='active' and expires_at>now();
  end if;
  if v_target is null or v_target=u then raise exception 'invalid_creator'; end if;

  v_variant:=public.get_recommendation_variant('rec_blend_v3');
  if p_event='impression' and exists(
    select 1 from public.recommendation_events e
    where e.user_id=u and e.event_type='impression' and e.content_type=p_item_type and e.content_id=p_item_id
      and e.metadata->>'sessionId'=coalesce(p_session_id,'') and e.occurred_at>now()-interval '6 hours'
  ) then
    return jsonb_build_object('ok',true,'recorded',false,'deduped',true,'variant',v_variant);
  end if;

  insert into public.recommendation_events(user_id,event_type,target_user_id,content_type,content_id,dwell_ms,metadata)
  values(u,p_event,v_target,p_item_type,p_item_id,p_dwell_ms,jsonb_strip_nulls(jsonb_build_object('sessionId',p_session_id,'position',p_position,'variant',v_variant)));

  if p_event='not_interested' then
    insert into public.recommendation_suppressions(user_id,suppression_type,item_type,item_id,creator_id,reason)
    values(u,'item',p_item_type,p_item_id,v_target,'not_interested') on conflict do nothing;
  elsif p_event='hide_author' then
    insert into public.recommendation_suppressions(user_id,suppression_type,item_type,item_id,creator_id,reason)
    values(u,'creator',null,null,v_target,'hide_author') on conflict do nothing;
  end if;
  return jsonb_build_object('ok',true,'recorded',true,'variant',v_variant);
end; $$;
revoke all on function public.record_recommendation_feedback(text,text,uuid,uuid,integer,text,integer) from public,anon;
grant execute on function public.record_recommendation_feedback(text,text,uuid,uuid,integer,text,integer) to authenticated;

create or replace function public.get_ad_for_placement(p_placement text,p_creator_context uuid default null,p_request_id uuid default gen_random_uuid()) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); pl public.ad_placements%rowtype; c record; n record; v_creator uuid:=null; v_recent integer:=0;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  select * into pl from public.ad_placements where slug=p_placement and enabled=true;
  if not found then return null; end if;

  select count(*) into v_recent from public.ad_delivery_requests
  where user_id=u and placement_id=pl.id and created_at>now()-interval '6 hours';
  if pl.max_per_session>0 and v_recent>=pl.max_per_session then return null; end if;

  if p_creator_context is not null and p_creator_context<>u and exists(
    select 1 from public.creator_profiles cp where cp.user_id=p_creator_context and cp.active=true
  ) then v_creator:=p_creator_context; end if;

  select ca.id campaign_id,cr.id creative_id,ca.advertiser_name,ca.name campaign_name,ca.destination_url,
         ca.cpm_usd_micros,ca.cpc_usd_micros,ca.budget_usd_micros,cr.headline,cr.body,cr.image_url,cr.call_to_action,cr.disclosure
  into c
  from public.ad_campaigns ca
  join public.ad_networks nw on nw.id=ca.network_id and nw.enabled=true and nw.mode='direct'
  join public.ad_campaign_placements cp on cp.campaign_id=ca.id and cp.placement_id=pl.id
  join public.ad_creatives cr on cr.campaign_id=ca.id and cr.status='active'
  where ca.status='active' and (ca.starts_at is null or ca.starts_at<=now()) and (ca.ends_at is null or ca.ends_at>now())
    and (ca.budget_usd_micros=0 or coalesce((select sum(e.gross_usd_micros) from public.ad_events e where e.campaign_id=ca.id),0)<ca.budget_usd_micros)
  order by md5(u::text||ca.id::text||current_date::text||p_request_id::text) limit 1;

  if found then
    insert into public.ad_delivery_requests(request_id,user_id,creator_context_id,placement_id,campaign_id,creative_id,expires_at)
    values(p_request_id,u,v_creator,pl.id,c.campaign_id,c.creative_id,now()+interval '20 minutes');
    return jsonb_build_object('kind','direct','requestId',p_request_id,'placementId',pl.id,'placement',pl.slug,'creatorContextId',v_creator,
      'campaignId',c.campaign_id,'creativeId',c.creative_id,'advertiser',c.advertiser_name,'headline',c.headline,'body',c.body,'imageUrl',c.image_url,
      'cta',c.call_to_action,'disclosure',c.disclosure,'destinationUrl',c.destination_url);
  end if;

  select nw.provider_slug,nw.display_name,nw.public_config into n
  from public.ad_networks nw where nw.enabled=true and nw.mode='external' order by nw.id limit 1;
  if found and pl.external_slot_key is not null then
    return jsonb_build_object('kind','external','requestId',p_request_id,'placementId',pl.id,'placement',pl.slug,'creatorContextId',v_creator,
      'provider',n.provider_slug,'providerName',n.display_name,'publicConfig',n.public_config,'slotKey',pl.external_slot_key);
  end if;
  return null;
end; $$;
revoke all on function public.get_ad_for_placement(text,uuid,uuid) from public,anon;
grant execute on function public.get_ad_for_placement(text,uuid,uuid) to authenticated;

create or replace function public.record_ad_event(p_request uuid,p_event text,p_placement bigint,p_campaign bigint,p_creative bigint,p_creator_context uuid default null,p_session_id text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); c public.ad_campaigns%rowtype; d public.ad_delivery_requests%rowtype; gross bigint:=0; share integer:=0; creator_amount bigint:=0; eid bigint;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if p_event not in ('impression','click') then raise exception 'invalid_event'; end if;
  if exists(select 1 from public.ad_events where request_id=p_request and event_type=p_event) then return jsonb_build_object('ok',true,'deduped',true); end if;

  select * into d from public.ad_delivery_requests where request_id=p_request and user_id=u and expires_at>now();
  if not found then raise exception 'invalid_or_expired_delivery'; end if;
  if d.placement_id<>p_placement or d.campaign_id<>p_campaign or d.creative_id<>p_creative then raise exception 'delivery_mismatch'; end if;
  if coalesce(d.creator_context_id,'00000000-0000-0000-0000-000000000000'::uuid)<>coalesce(p_creator_context,'00000000-0000-0000-0000-000000000000'::uuid) then raise exception 'creator_mismatch'; end if;
  if p_event='click' and not exists(select 1 from public.ad_events where request_id=p_request and event_type='impression') then raise exception 'impression_required'; end if;

  select * into c from public.ad_campaigns where id=d.campaign_id and status in ('active','completed');
  if not found then raise exception 'campaign_unavailable'; end if;
  gross:=case when p_event='impression' then c.cpm_usd_micros/1000 else c.cpc_usd_micros end;
  if d.creator_context_id is not null then
    select revenue_share_bps into share from public.creator_profiles where user_id=d.creator_context_id and active=true;
  end if;
  creator_amount:=case when share is null then 0 else gross*share/10000 end;

  insert into public.ad_events(request_id,user_id,creator_context_id,placement_id,campaign_id,creative_id,event_type,session_id,gross_usd_micros,creator_usd_micros)
  values(p_request,u,d.creator_context_id,d.placement_id,d.campaign_id,d.creative_id,p_event,left(p_session_id,120),gross,creator_amount) returning id into eid;
  if creator_amount>0 then
    insert into public.creator_earnings_ledger(user_id,ad_event_id,source_type,gross_usd_micros,creator_usd_micros,status)
    values(d.creator_context_id,eid,case when p_event='impression' then 'ad_impression' else 'ad_click' end,gross,creator_amount,'approved');
  end if;
  return jsonb_build_object('ok',true,'grossUsdMicros',gross,'creatorUsdMicros',creator_amount);
end; $$;
revoke all on function public.record_ad_event(uuid,text,bigint,bigint,bigint,uuid,text) from public,anon;
grant execute on function public.record_ad_event(uuid,text,bigint,bigint,bigint,uuid,text) to authenticated;
