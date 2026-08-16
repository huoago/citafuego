-- Recommendation V2: interest graph + For You surfaces + media distribution policy.
-- Safety taxonomy is adapted from TikTok's publicly documented Community Guidelines/FYF concepts;
-- it does not claim to reproduce TikTok's proprietary classifiers or internal thresholds.

create table if not exists public.recommendation_events(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check(event_type in ('profile_view','blog_view')),
  target_user_id uuid references auth.users(id) on delete cascade,
  content_type text check(content_type is null or content_type in ('profile','blog')),
  content_id uuid,
  dwell_ms integer check(dwell_ms is null or dwell_ms between 0 and 3600000),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists recommendation_events_user_time_idx on public.recommendation_events(user_id,occurred_at desc);
create index if not exists recommendation_events_target_time_idx on public.recommendation_events(target_user_id,occurred_at desc) where target_user_id is not null;

create table if not exists public.interest_edges(
  user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  direct_score numeric(8,3) not null default 0,
  social_score numeric(8,3) not null default 0,
  score numeric(8,3) not null default 0,
  signal_count integer not null default 0,
  last_signal_at timestamptz,
  signals jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(user_id,target_user_id),
  check(user_id<>target_user_id)
);
create index if not exists interest_edges_rank_idx on public.interest_edges(user_id,score desc,updated_at desc);

alter table public.recommendation_events enable row level security;
alter table public.interest_edges enable row level security;

drop policy if exists recommendation_events_self_read on public.recommendation_events;
create policy recommendation_events_self_read on public.recommendation_events for select to authenticated using(user_id=auth.uid() or public.is_trust_admin(auth.uid()));
drop policy if exists interest_edges_self_read on public.interest_edges;
create policy interest_edges_self_read on public.interest_edges for select to authenticated using(user_id=auth.uid() or public.is_trust_admin(auth.uid()));

grant select on public.recommendation_events,public.interest_edges to authenticated;
revoke insert,update,delete on public.recommendation_events,public.interest_edges from authenticated,anon;

-- Media review metadata and distribution status.
alter table public.profile_photos add column if not exists recommendation_status text not null default 'pending';
alter table public.profile_photos add column if not exists review_policy text;
alter table public.profile_photos add column if not exists review_labels text[] not null default '{}'::text[];
alter table public.profile_photos add column if not exists review_reason text;
alter table public.profile_photos add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.profile_photos add column if not exists reviewed_at timestamptz;
alter table public.profile_photos drop constraint if exists profile_photos_recommendation_status_check;
alter table public.profile_photos add constraint profile_photos_recommendation_status_check check(recommendation_status in ('pending','eligible','blocked'));
update public.profile_photos set recommendation_status=case when status='approved' then 'eligible' when status='rejected' then 'blocked' else 'pending' end where recommendation_status='pending';

alter table public.blog_posts add column if not exists recommendation_status text not null default 'eligible';
alter table public.blog_posts drop constraint if exists blog_posts_recommendation_status_check;
alter table public.blog_posts add constraint blog_posts_recommendation_status_check check(recommendation_status in ('eligible','limited','blocked'));

alter table public.blog_post_media add column if not exists recommendation_status text not null default 'pending';
alter table public.blog_post_media add column if not exists review_policy text;
alter table public.blog_post_media add column if not exists review_labels text[] not null default '{}'::text[];
alter table public.blog_post_media add column if not exists review_reason text;
alter table public.blog_post_media add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.blog_post_media add column if not exists reviewed_at timestamptz;
alter table public.blog_post_media drop constraint if exists blog_post_media_recommendation_status_check;
alter table public.blog_post_media add constraint blog_post_media_recommendation_status_check check(recommendation_status in ('pending','eligible','limited','blocked'));
update public.blog_post_media set recommendation_status=case when status='approved' then 'eligible' when status='rejected' then 'blocked' else 'pending' end where recommendation_status='pending';

alter table public.story_media add column if not exists recommendation_status text not null default 'pending';
alter table public.story_media add column if not exists review_policy text;
alter table public.story_media add column if not exists review_labels text[] not null default '{}'::text[];
alter table public.story_media add column if not exists review_reason text;
alter table public.story_media add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.story_media add column if not exists reviewed_at timestamptz;
alter table public.story_media drop constraint if exists story_media_recommendation_status_check;
alter table public.story_media add constraint story_media_recommendation_status_check check(recommendation_status in ('pending','eligible','limited','blocked'));
update public.story_media set recommendation_status=case when status='approved' then 'eligible' when status='rejected' then 'blocked' else 'pending' end where recommendation_status='pending';

create or replace function public.record_recommendation_event(
  p_event text,
  p_target_user uuid default null,
  p_content_type text default null,
  p_content_id uuid default null,
  p_dwell_ms integer default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  u uuid:=auth.uid();
  target uuid:=p_target_user;
  normalized_type text:=p_content_type;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if p_event not in ('profile_view','blog_view') then raise exception 'invalid_event'; end if;
  if p_dwell_ms is not null and (p_dwell_ms<0 or p_dwell_ms>3600000) then raise exception 'invalid_dwell'; end if;

  if p_event='profile_view' then
    normalized_type:='profile';
    if target is null or target=u or not public.can_view_social_profile(target,u) then raise exception 'invalid_target'; end if;
    p_content_id:=target;
  elsif p_event='blog_view' then
    normalized_type:='blog';
    if p_content_id is null or not public.can_view_blog_post(p_content_id,u) then raise exception 'content_unavailable'; end if;
    select author_id into target from public.blog_posts where id=p_content_id;
    if target is null or target=u then return jsonb_build_object('ok',true,'recorded',false); end if;
  end if;

  if exists(
    select 1 from public.recommendation_events e
    where e.user_id=u and e.event_type=p_event
      and coalesce(e.target_user_id,'00000000-0000-0000-0000-000000000000'::uuid)=coalesce(target,'00000000-0000-0000-0000-000000000000'::uuid)
      and coalesce(e.content_id,'00000000-0000-0000-0000-000000000000'::uuid)=coalesce(p_content_id,'00000000-0000-0000-0000-000000000000'::uuid)
      and e.occurred_at>now()-interval '10 minutes'
  ) then
    return jsonb_build_object('ok',true,'recorded',false,'deduped',true);
  end if;

  insert into public.recommendation_events(user_id,event_type,target_user_id,content_type,content_id,dwell_ms,metadata)
  values(u,p_event,target,normalized_type,p_content_id,p_dwell_ms,coalesce(p_metadata,'{}'::jsonb));
  return jsonb_build_object('ok',true,'recorded',true);
end; $$;
revoke all on function public.record_recommendation_event(text,uuid,text,uuid,integer,jsonb) from public,anon;
grant execute on function public.record_recommendation_event(text,uuid,text,uuid,integer,jsonb) to authenticated;

create or replace function public.refresh_interest_graph_for(p_user uuid default auth.uid()) returns integer
language plpgsql security definer set search_path=public as $$
declare
  caller uuid:=auth.uid();
  inserted_count integer:=0;
begin
  if caller is null then raise exception 'not_authenticated'; end if;
  if p_user is null or (caller<>p_user and not public.is_trust_admin(caller)) then raise exception 'forbidden'; end if;

  delete from public.interest_edges where user_id=p_user;

  with raw_signals as (
    select e.target_user_id target_user_id,
      (case when e.event_type='profile_view' then 1.8 else 0.9 end + least(coalesce(e.dwell_ms,0),120000)::numeric/120000.0*1.2) weight,
      e.occurred_at signal_at,
      e.event_type signal_name
    from public.recommendation_events e
    where e.user_id=p_user and e.target_user_id is not null and e.occurred_at>now()-interval '180 days'

    union all
    select f.followed_id,6.0,f.created_at,'follow'
    from public.social_follows f where f.follower_id=p_user

    union all
    select s.author_id,1.4,sv.viewed_at,'story_view'
    from public.story_views sv join public.stories s on s.id=sv.story_id
    where sv.viewer_user_id=p_user and s.author_id<>p_user and sv.viewed_at>now()-interval '180 days'

    union all
    select bp.author_id,4.2,l.created_at,'blog_like'
    from public.blog_likes l join public.blog_posts bp on bp.id=l.post_id
    where l.user_id=p_user and bp.author_id<>p_user

    union all
    select bp.author_id,6.5,b.created_at,'blog_bookmark'
    from public.blog_bookmarks b join public.blog_posts bp on bp.id=b.post_id
    where b.user_id=p_user and bp.author_id<>p_user

    union all
    select bp.author_id,5.2,c.created_at,'blog_comment'
    from public.blog_comments c join public.blog_posts bp on bp.id=c.post_id
    where c.user_id=p_user and c.status='active' and bp.author_id<>p_user

    union all
    select i.to_user_id,
      case i.action::text when 'like' then 5.5 when 'superfuego' then 9.0 when 'pass' then -8.0 else 0 end,
      i.updated_at,'dating_'||i.action::text
    from public.interactions i where i.from_user_id=p_user

    union all
    select case when m.user_a=p_user then m.user_b else m.user_a end,
      12.0,m.matched_at,'match'
    from public.matches m where m.status='active' and (m.user_a=p_user or m.user_b=p_user)

    union all
    select case when mt.user_a=p_user then mt.user_b else mt.user_a end,
      least(count(msg.id),30)::numeric*0.38,
      max(msg.created_at),'chat_activity'
    from public.matches mt
    join public.conversations cv on cv.match_id=mt.id
    join public.messages msg on msg.conversation_id=cv.id and msg.status='sent'
    where mt.status='active' and (mt.user_a=p_user or mt.user_b=p_user)
      and msg.created_at>now()-interval '120 days'
    group by case when mt.user_a=p_user then mt.user_b else mt.user_a end
  ), weighted as (
    select r.target_user_id,
      sum(r.weight * (1.0/(1.0 + greatest(0,extract(epoch from (now()-r.signal_at))/86400.0)/45.0))) direct_score,
      count(*) signal_count,
      max(r.signal_at) last_signal_at
    from raw_signals r
    where r.target_user_id is not null and r.target_user_id<>p_user
    group by r.target_user_id
  )
  insert into public.interest_edges(user_id,target_user_id,direct_score,social_score,score,signal_count,last_signal_at,signals,updated_at)
  select p_user,w.target_user_id,
    greatest(-30,least(100,w.direct_score)),0,greatest(-30,least(100,w.direct_score)),w.signal_count,w.last_signal_at,
    jsonb_build_object('directWeightedScore',round(w.direct_score,3),'signalCount',w.signal_count),now()
  from weighted w
  where public.can_view_social_profile(w.target_user_id,p_user)
  on conflict(user_id,target_user_id) do update set direct_score=excluded.direct_score,social_score=0,score=excluded.score,signal_count=excluded.signal_count,last_signal_at=excluded.last_signal_at,signals=excluded.signals,updated_at=now();

  get diagnostics inserted_count = row_count;

  insert into public.interest_edges(user_id,target_user_id,direct_score,social_score,score,signal_count,last_signal_at,signals,updated_at)
  select p_user,sf.followed_id,0,
    least(24,sum(greatest(e.direct_score,0)*0.12)),
    least(24,sum(greatest(e.direct_score,0)*0.12)),
    count(*)::int,max(sf.created_at),jsonb_build_object('secondDegree',true,'anchors',count(*)),now()
  from public.interest_edges e
  join public.social_follows sf on sf.follower_id=e.target_user_id
  where e.user_id=p_user and e.direct_score>2 and sf.followed_id<>p_user
    and public.can_view_social_profile(sf.followed_id,p_user)
  group by sf.followed_id
  on conflict(user_id,target_user_id) do update set
    social_score=excluded.social_score,
    score=greatest(-30,least(100,public.interest_edges.direct_score+excluded.social_score)),
    signals=public.interest_edges.signals||excluded.signals,
    updated_at=now();

  return inserted_count;
end; $$;
revoke all on function public.refresh_interest_graph_for(uuid) from public,anon;
grant execute on function public.refresh_interest_graph_for(uuid) to authenticated;

create or replace function public.get_recommended_follows(p_limit integer default 12)
returns table(profile_id uuid,display_name text,district text,verified boolean,primary_photo_path text,recommendation_score numeric,reason text)
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); my_district text;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  perform public.refresh_interest_graph_for(u);
  select p.district into my_district from public.profiles p where p.id=u;
  return query
  select p.id,p.display_name,p.district,p.verification_badge,
    (select ph.storage_path from public.profile_photos ph where ph.user_id=p.id and ph.status='approved' and ph.recommendation_status='eligible' order by ph.is_primary desc,ph.position limit 1),
    round((coalesce(e.score,0)+case when p.district is not distinct from my_district then 2.0 else 0 end+case when p.verification_badge then .8 else 0 end+case when p.last_active_at>now()-interval '2 days' then 1.0 else 0 end)::numeric,3),
    case when coalesce(e.social_score,0)>=3 then 'Personas que interesan a tus conexiones' when coalesce(e.direct_score,0)>=3 then 'Basado en tu actividad' when p.district is not distinct from my_district then 'Cerca de ti' else 'Descubre una persona nueva' end
  from public.profiles p
  left join public.interest_edges e on e.user_id=u and e.target_user_id=p.id
  where p.id<>u and p.status='active' and public.can_view_social_profile(p.id,u)
    and not exists(select 1 from public.social_follows f where f.follower_id=u and f.followed_id=p.id)
    and not exists(select 1 from public.matches m where m.status='active' and ((m.user_a=u and m.user_b=p.id) or (m.user_b=u and m.user_a=p.id)))
    and coalesce(e.score,0)>-3
  order by (coalesce(e.score,0)+case when p.district is not distinct from my_district then 2.0 else 0 end+case when p.verification_badge then .8 else 0 end+case when p.last_active_at>now()-interval '2 days' then 1.0 else 0 end) desc,p.last_active_at desc nulls last
  limit least(greatest(coalesce(p_limit,12),1),30);
end; $$;
revoke all on function public.get_recommended_follows(integer) from public,anon;
grant execute on function public.get_recommended_follows(integer) to authenticated;

create or replace function public.get_recommended_matches(p_limit integer default 12)
returns table(profile_id uuid,display_name text,age integer,district text,distance_bucket text,bio text,intent relationship_intent,verified boolean,primary_photo_path text,shared_interest_count integer,chemistry_score integer,recommendation_score numeric,reason text)
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'not_authenticated'; end if;
  perform public.refresh_interest_graph_for(u);
  return query
  select c.profile_id,c.display_name,c.age,c.district,c.distance_bucket,c.bio,c.intent,c.verified,c.primary_photo_path,c.shared_interest_count,c.chemistry_score,
    round((c.chemistry_score::numeric*.72 + greatest(0,coalesce(e.score,0))*1.15)::numeric,3),
    case when coalesce(e.score,0)>=5 then 'Afinidad social + compatibilidad' when c.shared_interest_count>0 then 'Intereses compartidos' else 'Compatibilidad para citas' end
  from public.get_discover_candidates(100) c
  left join public.interest_edges e on e.user_id=u and e.target_user_id=c.profile_id
  where coalesce(e.score,0)>-3
  order by (c.chemistry_score::numeric*.72 + greatest(0,coalesce(e.score,0))*1.15) desc,c.verified desc
  limit least(greatest(coalesce(p_limit,12),1),30);
end; $$;
revoke all on function public.get_recommended_matches(integer) from public,anon;
grant execute on function public.get_recommended_matches(integer) to authenticated;

create or replace function public.get_recommended_blog_posts(p_limit integer default 16)
returns table(post_id uuid,author_id uuid,recommendation_score numeric,reason text)
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'not_authenticated'; end if;
  perform public.refresh_interest_graph_for(u);
  return query
  select bp.id,bp.author_id,
    round((greatest(0,coalesce(e.score,0))*1.25
      + ln(1+(select count(*) from public.blog_likes l where l.post_id=bp.id))*3.0
      + ln(1+(select count(*) from public.blog_bookmarks b where b.post_id=bp.id))*4.0
      + ln(1+(select count(*) from public.blog_comments c where c.post_id=bp.id and c.status='active'))*3.2
      + 14.0/(1.0+greatest(0,extract(epoch from (now()-bp.published_at))/86400.0)/7.0))::numeric,3),
    case when coalesce(e.score,0)>=5 then 'De alguien que te interesa' when exists(select 1 from public.blog_bookmarks b where b.post_id=bp.id) then 'Guardado por la comunidad' else 'Popular y reciente' end
  from public.blog_posts bp
  left join public.interest_edges e on e.user_id=u and e.target_user_id=bp.author_id
  where bp.status='active' and bp.author_id<>u and bp.recommendation_status='eligible'
    and bp.published_at is not null and bp.published_at>now()-interval '120 days'
    and public.can_view_blog_post(bp.id,u)
    and not exists(select 1 from public.blog_post_media m where m.post_id=bp.id and (m.status<>'approved' or m.recommendation_status<>'eligible'))
    and coalesce(e.score,0)>-3
  order by (greatest(0,coalesce(e.score,0))*1.25
      + ln(1+(select count(*) from public.blog_likes l where l.post_id=bp.id))*3.0
      + ln(1+(select count(*) from public.blog_bookmarks b where b.post_id=bp.id))*4.0
      + ln(1+(select count(*) from public.blog_comments c where c.post_id=bp.id and c.status='active'))*3.2
      + 14.0/(1.0+greatest(0,extract(epoch from (now()-bp.published_at))/86400.0)/7.0)) desc
  limit least(greatest(coalesce(p_limit,16),1),40);
end; $$;
revoke all on function public.get_recommended_blog_posts(integer) from public,anon;
grant execute on function public.get_recommended_blog_posts(integer) to authenticated;

create or replace function public.get_recommended_stories(p_limit integer default 16)
returns table(story_id uuid,author_id uuid,recommendation_score numeric,reason text)
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'not_authenticated'; end if;
  perform public.refresh_interest_graph_for(u);
  return query
  select s.id,s.author_id,
    round((greatest(0,coalesce(e.score,0))*1.4
      + ln(1+(select count(*) from public.story_views v where v.story_id=s.id))*2.2
      + 10.0/(1.0+greatest(0,extract(epoch from (now()-s.published_at))/3600.0)/8.0))::numeric,3),
    case when coalesce(e.score,0)>=5 then 'Story de alguien que te interesa' when exists(select 1 from public.social_follows f where f.follower_id=u and f.followed_id=s.author_id) then 'De alguien que sigues' else 'Story reciente' end
  from public.stories s
  left join public.interest_edges e on e.user_id=u and e.target_user_id=s.author_id
  where s.status='active' and s.author_id<>u and s.expires_at>now() and public.can_view_story(s.id,u)
    and not exists(select 1 from public.story_media sm where sm.story_id=s.id and (sm.status<>'approved' or sm.recommendation_status<>'eligible'))
    and coalesce(e.score,0)>-3
  order by (greatest(0,coalesce(e.score,0))*1.4
      + ln(1+(select count(*) from public.story_views v where v.story_id=s.id))*2.2
      + 10.0/(1.0+greatest(0,extract(epoch from (now()-s.published_at))/3600.0)/8.0)) desc
  limit least(greatest(coalesce(p_limit,16),1),40);
end; $$;
revoke all on function public.get_recommended_stories(integer) from public,anon;
grant execute on function public.get_recommended_stories(integer) to authenticated;

create or replace function public.get_for_you_feed(p_limit integer default 30)
returns table(item_type text,item_id uuid,creator_id uuid,recommendation_score numeric,reason text)
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'not_authenticated'; end if;
  perform public.refresh_interest_graph_for(u);
  return query
  select q.item_type,q.item_id,q.creator_id,q.recommendation_score,q.reason
  from (
    select 'blog'::text btype,b.post_id bid,b.author_id bcreator,b.recommendation_score bscore,b.reason breason from public.get_recommended_blog_posts(20) b
    union all
    select 'story'::text,s.story_id,s.author_id,s.recommendation_score,s.reason from public.get_recommended_stories(20) s
    union all
    select 'profile'::text,p.profile_id,p.profile_id,p.recommendation_score,p.reason from public.get_recommended_follows(16) p
  ) q(item_type,item_id,creator_id,recommendation_score,reason)
  order by q.recommendation_score desc
  limit least(greatest(coalesce(p_limit,30),1),60);
end; $$;
revoke all on function public.get_for_you_feed(integer) from public,anon;
grant execute on function public.get_for_you_feed(integer) to authenticated;

-- Public-guideline-inspired review decisions. "limited" means the media may remain visible
-- to an otherwise authorized viewer but cannot enter CitaFuego recommendation surfaces.
create or replace function public.review_profile_photo_v2(p_photo uuid,p_decision text,p_labels text[] default '{}'::text[],p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a uuid:=auth.uid(); ph public.profile_photos%rowtype; policy text:='cf-media-2026-08-tiktok-public-adapted-v1';
begin
  if not public.is_trust_admin(a) then raise exception 'forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_decision'; end if;
  select * into ph from public.profile_photos where id=p_photo and status='pending' for update;
  if not found then raise exception 'not_found'; end if;
  update public.profile_photos set status=p_decision::photo_status,recommendation_status=case when p_decision='approved' then 'eligible' else 'blocked' end,
    review_policy=policy,review_labels=coalesce(p_labels,'{}'::text[]),review_reason=left(p_reason,1000),reviewed_by=a,reviewed_at=now(),updated_at=now()
  where id=p_photo;
  perform public.refresh_profile_activation_for(ph.user_id);
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(a,'profile_photo_'||p_decision,'profile_photo',p_photo::text,p_reason,jsonb_build_object('status',ph.status),jsonb_build_object('status',p_decision,'labels',p_labels,'policy',policy));
  return jsonb_build_object('ok',true,'userId',ph.user_id,'decision',p_decision);
end; $$;
revoke all on function public.review_profile_photo_v2(uuid,text,text[],text) from public,anon;
grant execute on function public.review_profile_photo_v2(uuid,text,text[],text) to authenticated;

create or replace function public.review_blog_media_v2(p_media uuid,p_decision text,p_labels text[] default '{}'::text[],p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a uuid:=auth.uid(); m public.blog_post_media%rowtype; policy text:='cf-media-2026-08-tiktok-public-adapted-v1'; db_status text; dist text;
begin
  if not public.is_trust_admin(a) then raise exception 'forbidden'; end if;
  if p_decision not in ('approved','limited','rejected') then raise exception 'invalid_decision'; end if;
  select * into m from public.blog_post_media where id=p_media and status='pending' for update;
  if not found then raise exception 'not_found'; end if;
  db_status:=case when p_decision='rejected' then 'rejected' else 'approved' end;
  dist:=case p_decision when 'approved' then 'eligible' when 'limited' then 'limited' else 'blocked' end;
  update public.blog_post_media set status=db_status,recommendation_status=dist,review_policy=policy,review_labels=coalesce(p_labels,'{}'::text[]),review_reason=left(p_reason,1000),reviewed_by=a,reviewed_at=now(),updated_at=now() where id=p_media;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(a,'blog_media_'||p_decision,'blog_media',p_media::text,p_reason,jsonb_build_object('status',m.status),jsonb_build_object('status',db_status,'distribution',dist,'labels',p_labels,'policy',policy));
  return jsonb_build_object('ok',true,'storagePath',m.storage_path,'postId',m.post_id,'decision',p_decision,'distribution',dist);
end; $$;
revoke all on function public.review_blog_media_v2(uuid,text,text[],text) from public,anon;
grant execute on function public.review_blog_media_v2(uuid,text,text[],text) to authenticated;

create or replace function public.review_story_media_v2(p_media uuid,p_decision text,p_labels text[] default '{}'::text[],p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a uuid:=auth.uid(); m public.story_media%rowtype; policy text:='cf-media-2026-08-tiktok-public-adapted-v1'; db_status text; dist text;
begin
  if not public.is_trust_admin(a) then raise exception 'forbidden'; end if;
  if p_decision not in ('approved','limited','rejected') then raise exception 'invalid_decision'; end if;
  select * into m from public.story_media where id=p_media and status='pending' for update;
  if not found then raise exception 'not_found'; end if;
  db_status:=case when p_decision='rejected' then 'rejected' else 'approved' end;
  dist:=case p_decision when 'approved' then 'eligible' when 'limited' then 'limited' else 'blocked' end;
  update public.story_media set status=db_status,recommendation_status=dist,review_policy=policy,review_labels=coalesce(p_labels,'{}'::text[]),review_reason=left(p_reason,1000),reviewed_by=a,reviewed_at=now(),updated_at=now() where id=p_media;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(a,'story_media_'||p_decision,'story_media',p_media::text,p_reason,jsonb_build_object('status',m.status),jsonb_build_object('status',db_status,'distribution',dist,'labels',p_labels,'policy',policy));
  return jsonb_build_object('ok',true,'storagePath',m.storage_path,'storyId',m.story_id,'decision',p_decision,'distribution',dist);
end; $$;
revoke all on function public.review_story_media_v2(uuid,text,text[],text) from public,anon;
grant execute on function public.review_story_media_v2(uuid,text,text[],text) to authenticated;
