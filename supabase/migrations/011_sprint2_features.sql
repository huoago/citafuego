-- Premium filters.
create table if not exists public.premium_discovery_filters(
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_only boolean not null default false,
  min_shared_interests smallint not null default 0 check(min_shared_interests between 0 and 8),
  recently_active_hours smallint check(recently_active_hours is null or recently_active_hours between 1 and 168),
  updated_at timestamptz not null default now()
);
alter table public.premium_discovery_filters enable row level security;
drop policy if exists premium_filters_self_read on public.premium_discovery_filters;
create policy premium_filters_self_read on public.premium_discovery_filters for select to authenticated using(user_id=auth.uid());

create or replace function public.has_premium_tier(p_min_tier text default 'plus') returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.subscriptions s where s.user_id=auth.uid() and s.status in ('trialing','active') and (s.current_period_end is null or s.current_period_end>now()) and (s.product_id='fuego_gold' or (p_min_tier='plus' and s.product_id='fuego_plus')));
$$;
revoke all on function public.has_premium_tier(text) from public;
grant execute on function public.has_premium_tier(text) to authenticated;

create or replace function public.update_premium_filters(p_verified_only boolean,p_min_shared smallint,p_recent_hours smallint default null)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.has_premium_tier('plus') then raise exception 'premium_required'; end if;
  if p_min_shared<0 or p_min_shared>8 or (p_recent_hours is not null and (p_recent_hours<1 or p_recent_hours>168)) then raise exception 'invalid_filter'; end if;
  insert into public.premium_discovery_filters(user_id,verified_only,min_shared_interests,recently_active_hours)
  values(auth.uid(),p_verified_only,p_min_shared,p_recent_hours)
  on conflict(user_id) do update set verified_only=excluded.verified_only,min_shared_interests=excluded.min_shared_interests,recently_active_hours=excluded.recently_active_hours,updated_at=now();
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.update_premium_filters(boolean,smallint,smallint) from public;
grant execute on function public.update_premium_filters(boolean,smallint,smallint) to authenticated;

drop function if exists public.get_discover_page(integer,integer);
create function public.get_discover_page(p_offset integer default 0,p_limit integer default 12)
returns table(profile_id uuid,display_name text,age integer,district text,distance_bucket text,bio text,intent public.relationship_intent,verified boolean,primary_photo_path text,interests text[],shared_interest_count integer,chemistry_score integer)
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_filter public.premium_discovery_filters%rowtype; v_has_plus boolean:=false;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.profiles where id=v_user and status='active') then raise exception 'profile_not_active'; end if;
  v_has_plus:=public.has_premium_tier('plus');
  if v_has_plus then select * into v_filter from public.premium_discovery_filters where user_id=v_user; end if;
  return query
  select d.profile_id,d.display_name,d.age,d.district,d.distance_bucket,d.bio,d.intent,d.verified,d.primary_photo_path,d.interests,d.shared_interest_count,d.chemistry_score
  from public.get_discover_candidates(50) d join public.profiles p on p.id=d.profile_id
  where (not v_has_plus or v_filter.user_id is null or ((not v_filter.verified_only or d.verified) and d.shared_interest_count>=v_filter.min_shared_interests and (v_filter.recently_active_hours is null or p.last_active_at>=now()-make_interval(hours=>v_filter.recently_active_hours))))
  order by d.chemistry_score desc,d.verified desc offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,12),1),25);
end; $$;
revoke all on function public.get_discover_page(integer,integer) from public;
grant execute on function public.get_discover_page(integer,integer) to authenticated;

create or replace function public.rewind_last_pass() returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_target uuid; v_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not public.has_premium_tier('plus') then raise exception 'premium_required'; end if;
  select id,to_user_id into v_id,v_target from public.interactions where from_user_id=v_user and action='pass' order by updated_at desc limit 1 for update;
  if v_id is null then return jsonb_build_object('rewound',false); end if;
  delete from public.interactions where id=v_id;
  return jsonb_build_object('rewound',true,'profile_id',v_target);
end; $$;
revoke all on function public.rewind_last_pass() from public;
grant execute on function public.rewind_last_pass() to authenticated;

create or replace function public.get_who_likes_me(p_offset integer default 0,p_limit integer default 24)
returns table(profile_id uuid,display_name text,age integer,district text,verified boolean,primary_photo_path text,liked_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.has_premium_tier('gold') then raise exception 'gold_required'; end if;
  return query select p.id,p.display_name,extract(year from age(current_date,priv.birth_date))::int,p.district,p.verification_badge,photo.storage_path,i.created_at
  from public.interactions i join public.profiles p on p.id=i.from_user_id and p.status='active' join public.user_private priv on priv.user_id=p.id
  left join lateral(select pp.storage_path from public.profile_photos pp where pp.user_id=p.id and pp.status='approved' order by pp.is_primary desc,pp.position asc limit 1) photo on true
  where i.to_user_id=auth.uid() and i.action in ('like','superfuego') and photo.storage_path is not null
    and not exists(select 1 from public.interactions mine where mine.from_user_id=auth.uid() and mine.to_user_id=i.from_user_id)
    and not exists(select 1 from public.blocks b where (b.blocker_id=auth.uid() and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=auth.uid()))
  order by i.created_at desc offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,24),1),50);
end; $$;
revoke all on function public.get_who_likes_me(integer,integer) from public;
grant execute on function public.get_who_likes_me(integer,integer) to authenticated;

create or replace function public.block_user(p_user uuid,p_reason text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_user is null or p_user=auth.uid() then raise exception 'invalid_target'; end if;
  insert into public.blocks(blocker_id,blocked_id,reason) values(auth.uid(),p_user,left(p_reason,500)) on conflict(blocker_id,blocked_id) do update set reason=excluded.reason;
  update public.matches set status='blocked',ended_at=now() where status='active' and ((user_a=auth.uid() and user_b=p_user) or (user_a=p_user and user_b=auth.uid()));
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.block_user(uuid,text) from public;
grant execute on function public.block_user(uuid,text) to authenticated;

create or replace function public.unblock_user(p_user uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from public.blocks where blocker_id=auth.uid() and blocked_id=p_user;
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.unblock_user(uuid) from public;
grant execute on function public.unblock_user(uuid) to authenticated;

create or replace function public.submit_report(p_reported uuid,p_category text,p_description text default null,p_conversation uuid default null,p_message uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_reported is null or p_reported=auth.uid() then raise exception 'invalid_target'; end if;
  if p_category not in ('fake_profile','harassment','scam','sexual_content','minor_risk','paid_sex','impersonation','threat','spam','other') then raise exception 'invalid_category'; end if;
  insert into public.reports(reporter_id,reported_user_id,conversation_id,message_id,category,description) values(auth.uid(),p_reported,p_conversation,p_message,p_category,left(p_description,2000)) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.submit_report(uuid,text,text,uuid,uuid) from public;
grant execute on function public.submit_report(uuid,text,text,uuid,uuid) to authenticated;

create index if not exists interactions_from_action_updated_idx on public.interactions(from_user_id,action,updated_at desc);
create index if not exists profiles_active_city_idx on public.profiles(city,country_code,status,last_active_at desc) where status='active';
create index if not exists profile_photos_approved_user_idx on public.profile_photos(user_id,is_primary desc,position) where status='approved';
create index if not exists subscriptions_user_status_period_idx on public.subscriptions(user_id,status,current_period_end desc);
create index if not exists blocks_blocked_idx on public.blocks(blocked_id,blocker_id);

grant usage on schema public to anon,authenticated;
grant select on public.legal_document_versions to anon,authenticated;
grant select on public.interests to authenticated;
grant select on public.profiles,public.user_private,public.dating_preferences,public.profile_interests,public.profile_photos,public.user_location_private,public.consent_events,public.media_upload_intents,public.verification_sessions,public.matches,public.conversations,public.conversation_members,public.messages,public.blocks,public.reports,public.sanctions,public.appeals,public.catalog_products,public.catalog_prices,public.subscriptions,public.purchases,public.entitlement_ledger,public.boost_activations,public.admin_user_roles,public.premium_discovery_filters to authenticated;
grant insert,update,delete on public.blocks to authenticated;
grant insert on public.reports,public.appeals,public.analytics_events to authenticated;
