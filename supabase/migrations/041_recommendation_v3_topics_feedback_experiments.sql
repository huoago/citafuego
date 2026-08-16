-- Recommendation V3: sparse topic vectors, learned user interests, explicit feedback,
-- exposure/click/dwell telemetry, diversity, cold-start handling and A/B testing.

alter table public.recommendation_events drop constraint if exists recommendation_events_event_type_check;
alter table public.recommendation_events add constraint recommendation_events_event_type_check check(event_type in (
  'profile_view','blog_view','impression','click','dwell','not_interested','hide_author'
));
alter table public.recommendation_events drop constraint if exists recommendation_events_content_type_check;
alter table public.recommendation_events add constraint recommendation_events_content_type_check check(content_type is null or content_type in ('profile','blog','story'));

create table if not exists public.content_topic_weights(
  content_type text not null check(content_type in ('blog','story')),
  content_id uuid not null,
  topic_id bigint not null references public.interests(id) on delete cascade,
  weight numeric(7,4) not null check(weight between 0 and 10),
  source text not null default 'rules' check(source in ('rules','author_interest','editorial','model')),
  updated_at timestamptz not null default now(),
  primary key(content_type,content_id,topic_id)
);
create index if not exists content_topic_weights_content_idx on public.content_topic_weights(content_type,content_id,weight desc);

create table if not exists public.user_topic_affinity(
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id bigint not null references public.interests(id) on delete cascade,
  weight numeric(9,4) not null default 0,
  evidence_count integer not null default 0,
  last_signal_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id,topic_id)
);
create index if not exists user_topic_affinity_rank_idx on public.user_topic_affinity(user_id,weight desc,updated_at desc);

create table if not exists public.recommendation_suppressions(
  user_id uuid not null references auth.users(id) on delete cascade,
  suppression_type text not null check(suppression_type in ('item','creator')),
  item_type text check(item_type is null or item_type in ('profile','blog','story')),
  item_id uuid,
  creator_id uuid references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key(user_id,suppression_type,item_type,item_id,creator_id)
);
create index if not exists recommendation_suppressions_user_idx on public.recommendation_suppressions(user_id,created_at desc);

create table if not exists public.recommendation_experiments(
  experiment_key text primary key,
  name text not null,
  status text not null default 'draft' check(status in ('draft','running','paused','completed')),
  variants jsonb not null default '["control"]'::jsonb,
  allocation jsonb not null default '{"control":100}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendation_experiment_assignments(
  user_id uuid not null references auth.users(id) on delete cascade,
  experiment_key text not null references public.recommendation_experiments(experiment_key) on delete cascade,
  variant text not null,
  assigned_at timestamptz not null default now(),
  primary key(user_id,experiment_key)
);

insert into public.recommendation_experiments(experiment_key,name,status,variants,allocation,started_at)
values('rec_blend_v3','Recommendation V3 blend','running','["control","social_first","topic_first"]'::jsonb,'{"control":34,"social_first":33,"topic_first":33}'::jsonb,now())
on conflict(experiment_key) do update set name=excluded.name,status='running',variants=excluded.variants,allocation=excluded.allocation,updated_at=now();

alter table public.content_topic_weights enable row level security;
alter table public.user_topic_affinity enable row level security;
alter table public.recommendation_suppressions enable row level security;
alter table public.recommendation_experiments enable row level security;
alter table public.recommendation_experiment_assignments enable row level security;

drop policy if exists content_topic_weights_auth_read on public.content_topic_weights;
create policy content_topic_weights_auth_read on public.content_topic_weights for select to authenticated using(true);
drop policy if exists user_topic_affinity_self_read on public.user_topic_affinity;
create policy user_topic_affinity_self_read on public.user_topic_affinity for select to authenticated using(user_id=auth.uid() or public.is_trust_admin(auth.uid()));
drop policy if exists recommendation_suppressions_self_read on public.recommendation_suppressions;
create policy recommendation_suppressions_self_read on public.recommendation_suppressions for select to authenticated using(user_id=auth.uid() or public.is_trust_admin(auth.uid()));
drop policy if exists recommendation_experiments_auth_read on public.recommendation_experiments;
create policy recommendation_experiments_auth_read on public.recommendation_experiments for select to authenticated using(status in ('running','completed') or public.is_trust_admin(auth.uid()));
drop policy if exists recommendation_assignments_self_read on public.recommendation_experiment_assignments;
create policy recommendation_assignments_self_read on public.recommendation_experiment_assignments for select to authenticated using(user_id=auth.uid() or public.is_trust_admin(auth.uid()));

grant select on public.content_topic_weights,public.user_topic_affinity,public.recommendation_suppressions,public.recommendation_experiments,public.recommendation_experiment_assignments to authenticated;
revoke insert,update,delete on public.content_topic_weights,public.user_topic_affinity,public.recommendation_suppressions,public.recommendation_experiments,public.recommendation_experiment_assignments from authenticated,anon;

create or replace function public.refresh_blog_topic_vector(p_post uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare v_author uuid; v_body text; v_count integer:=0;
begin
  select author_id,coalesce(body,'') into v_author,v_body from public.blog_posts where id=p_post;
  if v_author is null then return 0; end if;
  delete from public.content_topic_weights where content_type='blog' and content_id=p_post;
  insert into public.content_topic_weights(content_type,content_id,topic_id,weight,source)
  select 'blog',p_post,pi.interest_id,0.35,'author_interest' from public.profile_interests pi where pi.user_id=v_author
  on conflict(content_type,content_id,topic_id) do update set weight=greatest(public.content_topic_weights.weight,excluded.weight),source=excluded.source,updated_at=now();
  insert into public.content_topic_weights(content_type,content_id,topic_id,weight,source)
  select 'blog',p_post,i.id,1.0,'rules' from public.interests i
  where i.active and length(trim(i.label_es))>=3 and (
    lower(v_body) like '%'||lower(i.label_es)||'%' or lower(v_body) like '%'||replace(lower(i.slug),'-',' ')||'%'
  )
  on conflict(content_type,content_id,topic_id) do update set weight=greatest(public.content_topic_weights.weight,excluded.weight),source='rules',updated_at=now();
  get diagnostics v_count=row_count; return v_count;
end; $$;

create or replace function public.refresh_story_topic_vector(p_story uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare v_author uuid; v_body text; v_count integer:=0;
begin
  select author_id,coalesce(body,'') into v_author,v_body from public.stories where id=p_story;
  if v_author is null then return 0; end if;
  delete from public.content_topic_weights where content_type='story' and content_id=p_story;
  insert into public.content_topic_weights(content_type,content_id,topic_id,weight,source)
  select 'story',p_story,pi.interest_id,0.35,'author_interest' from public.profile_interests pi where pi.user_id=v_author
  on conflict(content_type,content_id,topic_id) do update set weight=greatest(public.content_topic_weights.weight,excluded.weight),source=excluded.source,updated_at=now();
  insert into public.content_topic_weights(content_type,content_id,topic_id,weight,source)
  select 'story',p_story,i.id,1.0,'rules' from public.interests i
  where i.active and length(trim(i.label_es))>=3 and (
    lower(v_body) like '%'||lower(i.label_es)||'%' or lower(v_body) like '%'||replace(lower(i.slug),'-',' ')||'%'
  )
  on conflict(content_type,content_id,topic_id) do update set weight=greatest(public.content_topic_weights.weight,excluded.weight),source='rules',updated_at=now();
  get diagnostics v_count=row_count; return v_count;
end; $$;

create or replace function public.sync_content_topic_vector() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='blog_posts' then perform public.refresh_blog_topic_vector(new.id); else perform public.refresh_story_topic_vector(new.id); end if;
  return new;
end; $$;

drop trigger if exists blog_posts_topic_vector_sync on public.blog_posts;
create trigger blog_posts_topic_vector_sync after insert or update of body,author_id,status on public.blog_posts for each row execute function public.sync_content_topic_vector();
drop trigger if exists stories_topic_vector_sync on public.stories;
create trigger stories_topic_vector_sync after insert or update of body,author_id,status on public.stories for each row execute function public.sync_content_topic_vector();

select public.refresh_blog_topic_vector(id) from public.blog_posts where status='active';
select public.refresh_story_topic_vector(id) from public.stories where status='active' and expires_at>now();

create or replace function public.get_recommendation_variant(p_experiment text default 'rec_blend_v3') returns text
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); v text; bucket integer;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  select variant into v from public.recommendation_experiment_assignments where user_id=u and experiment_key=p_experiment;
  if v is not null then return v; end if;
  bucket:=abs(hashtext(u::text||':'||p_experiment))%100;
  v:=case when bucket<34 then 'control' when bucket<67 then 'social_first' else 'topic_first' end;
  insert into public.recommendation_experiment_assignments(user_id,experiment_key,variant) values(u,p_experiment,v)
  on conflict(user_id,experiment_key) do nothing;
  return v;
end; $$;
revoke all on function public.get_recommendation_variant(text) from public,anon;
grant execute on function public.get_recommendation_variant(text) to authenticated;

create or replace function public.refresh_user_topic_affinity(p_user uuid default auth.uid()) returns integer
language plpgsql security definer set search_path=public as $$
declare caller uuid:=auth.uid(); v_count integer:=0;
begin
  if caller is null then raise exception 'not_authenticated'; end if;
  if p_user is null or (caller<>p_user and not public.is_trust_admin(caller)) then raise exception 'forbidden'; end if;
  delete from public.user_topic_affinity where user_id=p_user;
  with signals as (
    select pi.interest_id topic_id,2.0::numeric weight,pi.created_at at from public.profile_interests pi where pi.user_id=p_user
    union all
    select ctw.topic_id,
      ctw.weight*case e.event_type when 'click' then 1.8 when 'dwell' then least(coalesce(e.dwell_ms,0),120000)::numeric/40000.0 when 'not_interested' then -4.5 when 'blog_view' then .7 else .08 end,
      e.occurred_at
    from public.recommendation_events e join public.content_topic_weights ctw on ctw.content_type=e.content_type and ctw.content_id=e.content_id
    where e.user_id=p_user and e.occurred_at>now()-interval '180 days' and e.content_type in ('blog','story')
    union all
    select ctw.topic_id,ctw.weight*2.8,l.created_at from public.blog_likes l join public.content_topic_weights ctw on ctw.content_type='blog' and ctw.content_id=l.post_id where l.user_id=p_user
    union all
    select ctw.topic_id,ctw.weight*4.2,b.created_at from public.blog_bookmarks b join public.content_topic_weights ctw on ctw.content_type='blog' and ctw.content_id=b.post_id where b.user_id=p_user
    union all
    select ctw.topic_id,ctw.weight*3.4,c.created_at from public.blog_comments c join public.content_topic_weights ctw on ctw.content_type='blog' and ctw.content_id=c.post_id where c.user_id=p_user and c.status='active'
    union all
    select ctw.topic_id,ctw.weight*1.3,sv.viewed_at from public.story_views sv join public.content_topic_weights ctw on ctw.content_type='story' and ctw.content_id=sv.story_id where sv.viewer_user_id=p_user
    union all
    select pi.interest_id,3.0,f.created_at from public.social_follows f join public.profile_interests pi on pi.user_id=f.followed_id where f.follower_id=p_user
  ), agg as (
    select topic_id,sum(weight*(1.0/(1.0+greatest(0,extract(epoch from(now()-at))/86400.0)/60.0))) learned,count(*) evidence,max(at) last_at
    from signals group by topic_id
  )
  insert into public.user_topic_affinity(user_id,topic_id,weight,evidence_count,last_signal_at,updated_at)
  select p_user,topic_id,greatest(-20,least(100,learned)),evidence::int,last_at,now() from agg where abs(learned)>.05;
  get diagnostics v_count=row_count; return v_count;
end; $$;
revoke all on function public.refresh_user_topic_affinity(uuid) from public,anon;
grant execute on function public.refresh_user_topic_affinity(uuid) to authenticated;

create or replace function public.get_my_learned_topics(p_limit integer default 8)
returns table(topic_id bigint,slug text,label_es text,weight numeric,evidence_count integer)
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'not_authenticated'; end if;
  perform public.refresh_user_topic_affinity(u);
  return query select a.topic_id,i.slug,i.label_es,round(a.weight,3),a.evidence_count from public.user_topic_affinity a join public.interests i on i.id=a.topic_id where a.user_id=u and a.weight>0 order by a.weight desc limit least(greatest(coalesce(p_limit,8),1),20);
end; $$;
revoke all on function public.get_my_learned_topics(integer) from public,anon;
grant execute on function public.get_my_learned_topics(integer) to authenticated;

create or replace function public.record_recommendation_feedback(
  p_event text,p_item_type text,p_item_id uuid,p_creator uuid,p_dwell_ms integer default null,p_session_id text default null,p_position integer default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); v_variant text; v_target uuid:=p_creator;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if p_event not in ('impression','click','dwell','not_interested','hide_author') then raise exception 'invalid_event'; end if;
  if p_item_type not in ('profile','blog','story') then raise exception 'invalid_item_type'; end if;
  if p_dwell_ms is not null and (p_dwell_ms<0 or p_dwell_ms>3600000) then raise exception 'invalid_dwell'; end if;
  if p_item_type='profile' then v_target:=p_item_id; end if;
  if v_target is null or v_target=u then raise exception 'invalid_creator'; end if;
  if p_item_type='profile' and not public.can_view_social_profile(p_item_id,u) then raise exception 'item_unavailable'; end if;
  if p_item_type='blog' and not public.can_view_blog_post(p_item_id,u) then raise exception 'item_unavailable'; end if;
  if p_item_type='story' and not public.can_view_story(p_item_id,u) then raise exception 'item_unavailable'; end if;
  v_variant:=public.get_recommendation_variant('rec_blend_v3');
  if p_event='impression' and exists(select 1 from public.recommendation_events e where e.user_id=u and e.event_type='impression' and e.content_type=p_item_type and e.content_id=p_item_id and e.metadata->>'sessionId'=coalesce(p_session_id,'') and e.occurred_at>now()-interval '6 hours') then
    return jsonb_build_object('ok',true,'recorded',false,'deduped',true,'variant',v_variant);
  end if;
  insert into public.recommendation_events(user_id,event_type,target_user_id,content_type,content_id,dwell_ms,metadata)
  values(u,p_event,v_target,p_item_type,p_item_id,p_dwell_ms,jsonb_strip_nulls(jsonb_build_object('sessionId',p_session_id,'position',p_position,'variant',v_variant)));
  if p_event='not_interested' then
    insert into public.recommendation_suppressions(user_id,suppression_type,item_type,item_id,creator_id,reason) values(u,'item',p_item_type,p_item_id,v_target,'not_interested') on conflict do nothing;
  elsif p_event='hide_author' then
    insert into public.recommendation_suppressions(user_id,suppression_type,item_type,item_id,creator_id,reason) values(u,'creator',null,null,v_target,'hide_author') on conflict do nothing;
  end if;
  return jsonb_build_object('ok',true,'recorded',true,'variant',v_variant);
end; $$;
revoke all on function public.record_recommendation_feedback(text,text,uuid,uuid,integer,text,integer) from public,anon;
grant execute on function public.record_recommendation_feedback(text,text,uuid,uuid,integer,text,integer) to authenticated;

create or replace function public.get_for_you_feed(p_limit integer default 30)
returns table(item_type text,item_id uuid,creator_id uuid,recommendation_score numeric,reason text)
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); v_variant text; v_events integer:=0; v_cold boolean:=false;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  perform public.refresh_interest_graph_for(u);
  perform public.refresh_user_topic_affinity(u);
  v_variant:=public.get_recommendation_variant('rec_blend_v3');
  select count(*) into v_events from public.recommendation_events where user_id=u and occurred_at>now()-interval '30 days';
  v_cold:=v_events<8;
  return query
  with candidate as (
    select 'blog'::text item_type,b.post_id item_id,b.author_id creator_id,b.recommendation_score base_score,b.reason base_reason from public.get_recommended_blog_posts(30) b
    union all
    select 'story',s.story_id,s.author_id,s.recommendation_score,s.reason from public.get_recommended_stories(30) s
    union all
    select 'profile',p.profile_id,p.profile_id,p.recommendation_score,p.reason from public.get_recommended_follows(24) p
  ), scored as (
    select c.*,
      case c.item_type
        when 'profile' then coalesce((select sum(a.weight*0.22) from public.user_topic_affinity a join public.profile_interests pi on pi.interest_id=a.topic_id where a.user_id=u and pi.user_id=c.item_id),0)
        else coalesce((select sum(a.weight*w.weight) from public.user_topic_affinity a join public.content_topic_weights w on w.topic_id=a.topic_id where a.user_id=u and w.content_type=c.item_type and w.content_id=c.item_id),0)
      end topic_score,
      case when v_cold then (
        case c.item_type when 'blog' then coalesce((select least(count(*)::numeric,20)*.12 from public.blog_likes l where l.post_id=c.item_id),0)
        when 'story' then coalesce((select least(count(*)::numeric,20)*.08 from public.story_views sv where sv.story_id=c.item_id),0)
        else coalesce((select case when p.verification_badge then 1.2 else 0 end+case when p.last_active_at>now()-interval '2 days' then 1.0 else 0 end from public.profiles p where p.id=c.item_id),0) end
      ) else 0 end cold_score
    from candidate c
    where not exists(select 1 from public.recommendation_suppressions s where s.user_id=u and ((s.suppression_type='creator' and s.creator_id=c.creator_id) or (s.suppression_type='item' and s.item_type=c.item_type and s.item_id=c.item_id)))
  ), blended as (
    select s.*,
      case v_variant when 'social_first' then s.base_score*1.12+s.topic_score*.10+s.cold_score
                     when 'topic_first' then s.base_score*.84+s.topic_score*.38+s.cold_score
                     else s.base_score+s.topic_score*.20+s.cold_score end blended_score
    from scored s
  ), diversified as (
    select b.*,row_number() over(partition by b.creator_id order by b.blended_score desc) creator_rank,row_number() over(partition by b.item_type order by b.blended_score desc) type_rank
    from blended b
  )
  select d.item_type,d.item_id,d.creator_id,
    round((d.blended_score-(greatest(d.creator_rank-1,0)*4.0)-case when d.type_rank>greatest(5,p_limit/2) then 1.5 else 0 end)::numeric,3),
    case when d.topic_score>=4 then 'Coincide con temas que te interesan' when v_cold then 'Exploración segura para conocerte mejor' when v_variant='social_first' then 'Afinidad con tu red y actividad' when v_variant='topic_first' then 'Afinidad temática aprendida' else d.base_reason end
  from diversified d
  order by (d.blended_score-(greatest(d.creator_rank-1,0)*4.0)-case when d.type_rank>greatest(5,p_limit/2) then 1.5 else 0 end) desc,d.item_type
  limit least(greatest(coalesce(p_limit,30),1),60);
end; $$;

create or replace function public.admin_get_recommendation_metrics(p_days integer default 14) returns jsonb
language plpgsql security definer set search_path=public as $$
declare d integer:=least(greatest(coalesce(p_days,14),1),90); result jsonb;
begin
  if not public.admin_has_any_role(array['super_admin','analyst']) then raise exception 'forbidden'; end if;
  with base as (
    select e.*,coalesce(e.metadata->>'variant','unknown') variant from public.recommendation_events e where e.occurred_at>=now()-make_interval(days=>d)
  ), variants as (
    select variant,count(*) filter(where event_type='impression') impressions,count(*) filter(where event_type='click') clicks,
      round(coalesce(avg(dwell_ms) filter(where event_type='dwell'),0)) avg_dwell_ms,
      count(*) filter(where event_type='not_interested') not_interested,count(*) filter(where event_type='hide_author') hide_author
    from base group by variant
  )
  select jsonb_build_object(
    'days',d,
    'impressions',(select count(*) from base where event_type='impression'),
    'clicks',(select count(*) from base where event_type='click'),
    'ctr',case when (select count(*) from base where event_type='impression')=0 then 0 else round((select count(*)::numeric from base where event_type='click')/(select count(*)::numeric from base where event_type='impression')*100,2) end,
    'avgDwellMs',coalesce((select round(avg(dwell_ms)) from base where event_type='dwell'),0),
    'notInterested',(select count(*) from base where event_type='not_interested'),
    'hiddenAuthors',(select count(*) from base where event_type='hide_author'),
    'variants',coalesce((select jsonb_agg(jsonb_build_object('variant',variant,'impressions',impressions,'clicks',clicks,'ctr',case when impressions=0 then 0 else round(clicks::numeric/impressions*100,2) end,'avgDwellMs',avg_dwell_ms,'notInterested',not_interested,'hiddenAuthors',hide_author) order by variant) from variants),'[]'::jsonb)
  ) into result;
  return result;
end; $$;
revoke all on function public.admin_get_recommendation_metrics(integer) from public,anon,authenticated;
grant execute on function public.admin_get_recommendation_metrics(integer) to authenticated;
