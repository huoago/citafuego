-- Social graph, integrated public profiles, bookmarks, mentions, threaded comments,
-- social reports, video blog media and 24-hour Stories.

alter table public.media_upload_intents drop constraint if exists media_upload_intents_bucket_check;
alter table public.media_upload_intents add constraint media_upload_intents_bucket_check check (bucket in ('profile-photos','verification-selfies','blog-media','story-media'));
alter table public.media_upload_intents drop constraint if exists media_upload_intents_kind_check;
alter table public.media_upload_intents add constraint media_upload_intents_kind_check check (kind in ('profile_photo','verification_selfie','blog_image','blog_video','story_media'));
alter table public.media_upload_intents drop constraint if exists media_upload_intents_size_bytes_check;
alter table public.media_upload_intents add constraint media_upload_intents_size_bytes_check check (size_bytes between 1 and 52428800);

alter table public.user_notifications drop constraint if exists user_notifications_kind_check;
alter table public.user_notifications add constraint user_notifications_kind_check check (kind in ('like','match','message','boost','random','system','blog','social','story'));

update storage.buckets set file_size_limit=52428800,allowed_mime_types=array['image/jpeg','image/png','image/webp','video/mp4','video/webm'] where id='blog-media';
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('story-media','story-media',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.blog_post_media add column if not exists media_kind text not null default 'image';
alter table public.blog_post_media add column if not exists mime_type text not null default 'image/webp';
alter table public.blog_post_media drop constraint if exists blog_post_media_media_kind_check;
alter table public.blog_post_media add constraint blog_post_media_media_kind_check check(media_kind in ('image','video'));
alter table public.blog_post_media drop constraint if exists blog_post_media_mime_type_check;
alter table public.blog_post_media add constraint blog_post_media_mime_type_check check(mime_type in ('image/webp','video/mp4','video/webm'));

alter table public.blog_comments add column if not exists parent_comment_id uuid references public.blog_comments(id) on delete cascade;
create index if not exists blog_comments_parent_idx on public.blog_comments(parent_comment_id,created_at);

create table if not exists public.social_follows(
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,followed_id),
  check(follower_id<>followed_id)
);
create index if not exists social_follows_followed_idx on public.social_follows(followed_id,created_at desc);

create table if not exists public.social_handles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check(handle ~ '^[a-z0-9_]{3,24}$'),
  updated_at timestamptz not null default now()
);
insert into public.social_handles(user_id,handle)
select p.id,'u'||left(replace(p.id::text,'-',''),16) from public.profiles p
on conflict(user_id) do nothing;

create table if not exists public.blog_bookmarks(
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,post_id)
);
create index if not exists blog_bookmarks_user_idx on public.blog_bookmarks(user_id,created_at desc);

create table if not exists public.content_mentions(
  content_type text not null check(content_type in ('blog_post','blog_comment','story')),
  content_id uuid not null,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(content_type,content_id,mentioned_user_id)
);
create index if not exists content_mentions_user_idx on public.content_mentions(mentioned_user_id,created_at desc);

create table if not exists public.stories(
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '' check(char_length(body)<=700),
  visibility text not null default 'friends' check(visibility in ('public','friends','selected','private')),
  watermark_enabled boolean not null default true,
  download_protection boolean not null default true,
  status text not null default 'draft' check(status in ('draft','active','removed')),
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stories_active_expiry_idx on public.stories(expires_at,published_at desc) where status='active';
create index if not exists stories_author_idx on public.stories(author_id,published_at desc);

create table if not exists public.story_viewers(
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(story_id,viewer_user_id)
);

create table if not exists public.story_media(
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null unique references public.stories(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  media_kind text not null check(media_kind in ('image','video')),
  mime_type text not null check(mime_type in ('image/webp','video/mp4','video/webm')),
  status text not null default 'pending' check(status in ('pending','approved','rejected','removed')),
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists story_media_pending_idx on public.story_media(created_at) where status='pending';

create table if not exists public.story_views(
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key(story_id,viewer_user_id)
);

alter table public.reports add column if not exists blog_post_id uuid references public.blog_posts(id) on delete set null;
alter table public.reports add column if not exists blog_comment_id uuid references public.blog_comments(id) on delete set null;
alter table public.reports add column if not exists story_id uuid references public.stories(id) on delete set null;
create index if not exists reports_blog_post_idx on public.reports(blog_post_id) where blog_post_id is not null;
create index if not exists reports_story_idx on public.reports(story_id) where story_id is not null;

alter table public.social_follows enable row level security;
alter table public.social_handles enable row level security;
alter table public.blog_bookmarks enable row level security;
alter table public.content_mentions enable row level security;
alter table public.stories enable row level security;
alter table public.story_viewers enable row level security;
alter table public.story_media enable row level security;
alter table public.story_views enable row level security;

create or replace function public.can_view_social_profile(p_target uuid,p_viewer uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select p_viewer is not null and p_target is not null and (
    p_target=p_viewer or public.is_trust_admin(p_viewer) or (
      exists(select 1 from public.profiles p where p.id=p_target and p.status='active')
      and exists(select 1 from public.profiles p where p.id=p_viewer and p.status='active')
      and not exists(select 1 from public.blocks b where (b.blocker_id=p_target and b.blocked_id=p_viewer) or (b.blocker_id=p_viewer and b.blocked_id=p_target))
    )
  );
$$;
revoke all on function public.can_view_social_profile(uuid,uuid) from public,anon;
grant execute on function public.can_view_social_profile(uuid,uuid) to authenticated;

create or replace function public.can_view_story(p_story uuid,p_viewer uuid default auth.uid()) returns boolean
language plpgsql stable security definer set search_path=public as $$
declare s public.stories%rowtype;
begin
  if p_viewer is null then return false; end if;
  select * into s from public.stories where id=p_story;
  if not found or s.status='removed' then return false; end if;
  if s.author_id=p_viewer then return true; end if;
  if s.status<>'active' or s.expires_at is null or s.expires_at<=now() then return false; end if;
  if not public.can_view_social_profile(s.author_id,p_viewer) then return false; end if;
  if s.visibility='public' then return true; end if;
  if s.visibility='friends' then return public.is_blog_friend(s.author_id,p_viewer); end if;
  if s.visibility='selected' then return exists(select 1 from public.story_viewers v where v.story_id=p_story and v.viewer_user_id=p_viewer); end if;
  return false;
end; $$;
revoke all on function public.can_view_story(uuid,uuid) from public,anon;
grant execute on function public.can_view_story(uuid,uuid) to authenticated;

drop policy if exists social_handles_active_read on public.social_handles;
create policy social_handles_active_read on public.social_handles for select to authenticated using(public.can_view_social_profile(user_id,auth.uid()));
drop policy if exists social_follows_participant_read on public.social_follows;
create policy social_follows_participant_read on public.social_follows for select to authenticated using(follower_id=auth.uid() or followed_id=auth.uid() or public.is_trust_admin(auth.uid()));
drop policy if exists blog_bookmarks_self_read on public.blog_bookmarks;
create policy blog_bookmarks_self_read on public.blog_bookmarks for select to authenticated using(user_id=auth.uid());
drop policy if exists content_mentions_self_read on public.content_mentions;
create policy content_mentions_self_read on public.content_mentions for select to authenticated using(mentioned_user_id=auth.uid() or public.is_trust_admin(auth.uid()));
drop policy if exists stories_visible_read on public.stories;
create policy stories_visible_read on public.stories for select to authenticated using(public.can_view_story(id,auth.uid()) or public.is_trust_admin(auth.uid()));
drop policy if exists story_viewers_participant_read on public.story_viewers;
create policy story_viewers_participant_read on public.story_viewers for select to authenticated using(viewer_user_id=auth.uid() or public.is_trust_admin(auth.uid()) or exists(select 1 from public.stories s where s.id=story_id and s.author_id=auth.uid()));
drop policy if exists story_media_visible_read on public.story_media;
create policy story_media_visible_read on public.story_media for select to authenticated using(author_id=auth.uid() or public.is_trust_admin(auth.uid()) or (status='approved' and public.can_view_story(story_id,auth.uid())));
drop policy if exists story_views_participant_read on public.story_views;
create policy story_views_participant_read on public.story_views for select to authenticated using(viewer_user_id=auth.uid() or public.is_trust_admin(auth.uid()) or exists(select 1 from public.stories s where s.id=story_id and s.author_id=auth.uid()));

grant select on public.social_handles,public.social_follows,public.blog_bookmarks,public.content_mentions,public.stories,public.story_viewers,public.story_media,public.story_views to authenticated;
revoke insert,update,delete on public.social_handles,public.social_follows,public.blog_bookmarks,public.content_mentions,public.stories,public.story_viewers,public.story_media,public.story_views from authenticated,anon;

create or replace function public.set_social_handle(p_handle text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); h text:=lower(trim(coalesce(p_handle,'')));
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if h !~ '^[a-z0-9_]{3,24}$' then raise exception 'invalid_handle'; end if;
  if exists(select 1 from public.social_handles where handle=h and user_id<>u) then raise exception 'handle_taken'; end if;
  insert into public.social_handles(user_id,handle,updated_at) values(u,h,now())
  on conflict(user_id) do update set handle=excluded.handle,updated_at=now();
  return jsonb_build_object('ok',true,'handle',h);
end; $$;
revoke all on function public.set_social_handle(text) from public,anon;
grant execute on function public.set_social_handle(text) to authenticated;

create or replace function public.toggle_social_follow(p_target uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); followed boolean; cnt bigint;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if p_target is null or p_target=u or not public.can_view_social_profile(p_target,u) then raise exception 'invalid_target'; end if;
  if exists(select 1 from public.social_follows where follower_id=u and followed_id=p_target) then
    delete from public.social_follows where follower_id=u and followed_id=p_target; followed:=false;
  else
    insert into public.social_follows(follower_id,followed_id) values(u,p_target); followed:=true;
    insert into public.user_notifications(user_id,kind,title,body,href,actor_user_id)
    values(p_target,'social','Tienes un nuevo seguidor','Alguien empezó a seguir tu perfil.','/perfil/'||u::text,u);
  end if;
  select count(*) into cnt from public.social_follows where followed_id=p_target;
  return jsonb_build_object('ok',true,'following',followed,'followers',cnt);
end; $$;
revoke all on function public.toggle_social_follow(uuid) from public,anon;
grant execute on function public.toggle_social_follow(uuid) to authenticated;

create or replace function public.toggle_blog_bookmark(p_post uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); saved boolean;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if not public.can_view_blog_post(p_post,u) then raise exception 'post_unavailable'; end if;
  if exists(select 1 from public.blog_bookmarks where user_id=u and post_id=p_post) then
    delete from public.blog_bookmarks where user_id=u and post_id=p_post; saved:=false;
  else
    insert into public.blog_bookmarks(user_id,post_id) values(u,p_post); saved:=true;
  end if;
  return jsonb_build_object('ok',true,'saved',saved);
end; $$;
revoke all on function public.toggle_blog_bookmark(uuid) from public,anon;
grant execute on function public.toggle_blog_bookmark(uuid) to authenticated;

create or replace function public.get_my_bookmark_post_ids(p_limit integer default 100) returns table(post_id uuid,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select b.post_id,b.created_at from public.blog_bookmarks b where b.user_id=auth.uid() and public.can_view_blog_post(b.post_id,auth.uid()) order by b.created_at desc limit least(greatest(coalesce(p_limit,100),1),200);
$$;
revoke all on function public.get_my_bookmark_post_ids(integer) from public,anon;
grant execute on function public.get_my_bookmark_post_ids(integer) to authenticated;

create or replace function public.sync_social_mentions(p_type text,p_content uuid,p_body text,p_author uuid,p_parent_post uuid default null) returns void
language plpgsql security definer set search_path=public as $$
declare h text; target uuid; allowed boolean; link text;
begin
  if p_type not in ('blog_post','blog_comment','story') then return; end if;
  delete from public.content_mentions where content_type=p_type and content_id=p_content;
  for h in select distinct lower(m[1]) from regexp_matches(coalesce(p_body,''),'@([A-Za-z0-9_]{3,24})','g') m loop
    select user_id into target from public.social_handles where handle=h;
    if target is null or target=p_author then continue; end if;
    allowed:=case p_type when 'blog_post' then public.can_view_blog_post(p_content,target) when 'blog_comment' then public.can_view_blog_post(p_parent_post,target) when 'story' then public.can_view_story(p_content,target) else false end;
    if allowed and not exists(select 1 from public.blocks b where (b.blocker_id=p_author and b.blocked_id=target) or (b.blocker_id=target and b.blocked_id=p_author)) then
      insert into public.content_mentions(content_type,content_id,mentioned_user_id) values(p_type,p_content,target) on conflict do nothing;
      link:=case p_type when 'story' then '/stories/'||p_content::text else '/blog/'||coalesce(p_parent_post,p_content)::text end;
      insert into public.user_notifications(user_id,kind,title,body,href,actor_user_id) values(target,case when p_type='story' then 'story' else 'social' end,'Te mencionaron','Abre el contenido para ver la mención.',link,p_author);
    end if;
  end loop;
end; $$;
revoke all on function public.sync_social_mentions(text,uuid,text,uuid,uuid) from public,anon,authenticated;

create or replace function public.add_blog_comment(p_post uuid,p_body text,p_parent uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); bp public.blog_posts%rowtype; cid uuid; cnt bigint;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if not public.can_view_blog_post(p_post,u) then raise exception 'post_unavailable'; end if;
  select * into bp from public.blog_posts where id=p_post and status='active';
  if not found or not bp.comments_enabled then raise exception 'comments_disabled'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 1500 then raise exception 'invalid_comment'; end if;
  if p_parent is not null and not exists(select 1 from public.blog_comments c where c.id=p_parent and c.post_id=p_post and c.status='active') then raise exception 'invalid_parent'; end if;
  if not public.consume_user_rate_limit(u,'blog_comment_minute',60,20) then raise exception 'rate_limited'; end if;
  insert into public.blog_comments(post_id,user_id,body,parent_comment_id) values(p_post,u,trim(p_body),p_parent) returning id into cid;
  if bp.author_id<>u then insert into public.user_notifications(user_id,kind,title,body,href,actor_user_id) values(bp.author_id,'blog','Nuevo comentario en tu blog','Abre la publicación para verlo.','/blog/'||p_post::text,u); end if;
  if p_parent is not null then
    insert into public.user_notifications(user_id,kind,title,body,href,actor_user_id)
    select c.user_id,'social','Respondieron a tu comentario','Abre la conversación para verla.','/blog/'||p_post::text,u from public.blog_comments c where c.id=p_parent and c.user_id<>u and c.user_id<>bp.author_id;
  end if;
  perform public.sync_social_mentions('blog_comment',cid,p_body,u,p_post);
  select count(*) into cnt from public.blog_comments where post_id=p_post and status='active';
  return jsonb_build_object('ok',true,'commentId',cid,'count',cnt);
end; $$;
revoke all on function public.add_blog_comment(uuid,text,uuid) from public,anon;
grant execute on function public.add_blog_comment(uuid,text,uuid) to authenticated;

create or replace function public.add_blog_comment(p_post uuid,p_body text) returns jsonb
language sql security definer set search_path=public as $$ select public.add_blog_comment(p_post,p_body,null::uuid); $$;
revoke all on function public.add_blog_comment(uuid,text) from public,anon;
grant execute on function public.add_blog_comment(uuid,text) to authenticated;

drop function if exists public.get_blog_comments(uuid,integer);
create function public.get_blog_comments(p_post uuid,p_limit integer default 100)
returns table(comment_id uuid,user_id uuid,display_name text,verified boolean,body text,created_at timestamptz,can_delete boolean,parent_comment_id uuid,handle text)
language plpgsql stable security definer set search_path=public as $$
declare u uuid:=auth.uid(); author uuid;
begin
  if u is null or not public.can_view_blog_post(p_post,u) then raise exception 'post_unavailable'; end if;
  select author_id into author from public.blog_posts where id=p_post;
  return query select c.id,c.user_id,p.display_name,p.verification_badge,c.body,c.created_at,(c.user_id=u or author=u or public.is_trust_admin(u)),c.parent_comment_id,h.handle
  from public.blog_comments c join public.profiles p on p.id=c.user_id left join public.social_handles h on h.user_id=c.user_id
  where c.post_id=p_post and c.status='active' and not exists(select 1 from public.blocks b where (b.blocker_id=u and b.blocked_id=c.user_id) or (b.blocker_id=c.user_id and b.blocked_id=u))
  order by c.created_at asc limit least(greatest(coalesce(p_limit,100),1),200);
end; $$;
revoke all on function public.get_blog_comments(uuid,integer) from public,anon;
grant execute on function public.get_blog_comments(uuid,integer) to authenticated;

create or replace function public.publish_blog_post(p_post uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); body_text text;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  select body into body_text from public.blog_posts where id=p_post and author_id=u and status='draft' for update;
  if not found then raise exception 'post_unavailable'; end if;
  if trim(coalesce(body_text,''))='' and not exists(select 1 from public.blog_post_media m where m.post_id=p_post and m.status in ('pending','approved')) then raise exception 'post_empty'; end if;
  update public.blog_posts set status='active',published_at=now(),updated_at=now() where id=p_post;
  perform public.sync_social_mentions('blog_post',p_post,body_text,u,null);
  return jsonb_build_object('ok',true,'postId',p_post);
end; $$;
revoke all on function public.publish_blog_post(uuid) from public,anon;
grant execute on function public.publish_blog_post(uuid) to authenticated;

create or replace function public.create_blog_media_upload_intent(p_post uuid,p_mime_type text,p_size_bytes bigint,p_position smallint)
returns table(intent_id uuid,storage_path text,expires_at timestamptz)
language plpgsql security definer set search_path=public,storage as $$
declare u uuid:=auth.uid(); iid uuid:=gen_random_uuid(); ext text; path text; kind text; max_size bigint;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.blog_posts where id=p_post and author_id=u and status='draft') then raise exception 'post_unavailable'; end if;
  kind:=case when p_mime_type in ('image/jpeg','image/png','image/webp') then 'blog_image' when p_mime_type in ('video/mp4','video/webm') then 'blog_video' else null end;
  max_size:=case when kind='blog_image' then 8388608 else 52428800 end;
  if kind is null or p_size_bytes<1 or p_size_bytes>max_size then raise exception 'invalid_media'; end if;
  if p_position<0 or p_position>5 then raise exception 'invalid_position'; end if;
  ext:=case p_mime_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'video/mp4' then 'mp4' else 'webm' end;
  path:=u::text||'/raw-blog-'||gen_random_uuid()::text||'.'||ext;
  insert into public.media_upload_intents(id,user_id,bucket,storage_path,kind,mime_type,size_bytes,metadata) values(iid,u,'blog-media',path,kind,p_mime_type,p_size_bytes,jsonb_build_object('post_id',p_post,'position',p_position));
  return query select iid,path,(select m.expires_at from public.media_upload_intents m where m.id=iid);
end; $$;
revoke all on function public.create_blog_media_upload_intent(uuid,text,bigint,smallint) from public,anon;
grant execute on function public.create_blog_media_upload_intent(uuid,text,bigint,smallint) to authenticated;

create or replace function public.finalize_blog_video_upload(p_intent uuid,p_final_path text,p_status text) returns uuid
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); i public.media_upload_intents%rowtype; postid uuid; pos smallint; mid uuid;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if p_status not in ('pending','approved','rejected') then raise exception 'invalid_status'; end if;
  select * into i from public.media_upload_intents where id=p_intent and user_id=u and bucket='blog-media' and kind='blog_video' and status='created' and expires_at>now() for update;
  if not found then raise exception 'upload_intent_invalid'; end if;
  postid:=(i.metadata->>'post_id')::uuid; pos:=coalesce((i.metadata->>'position')::smallint,0);
  if not exists(select 1 from public.blog_posts where id=postid and author_id=u and status='draft') then raise exception 'post_unavailable'; end if;
  if p_final_path not like u::text||'/%' then raise exception 'invalid_storage_path'; end if;
  insert into public.blog_post_media(post_id,author_id,storage_path,position,status,width,height,media_kind,mime_type)
  values(postid,u,p_final_path,pos,p_status,null,null,'video',i.mime_type)
  on conflict(post_id,position) do update set storage_path=excluded.storage_path,status=excluded.status,width=null,height=null,media_kind='video',mime_type=excluded.mime_type,updated_at=now()
  returning id into mid;
  update public.media_upload_intents set status='consumed',consumed_at=now(),metadata=metadata||jsonb_build_object('final_path',p_final_path,'blog_media_id',mid) where id=p_intent;
  return mid;
end; $$;
revoke all on function public.finalize_blog_video_upload(uuid,text,text) from public,anon;
grant execute on function public.finalize_blog_video_upload(uuid,text,text) to authenticated;

create or replace function public.get_blog_feed(p_author uuid default null,p_offset integer default 0,p_limit integer default 20)
returns table(post_id uuid,author_id uuid,author_name text,author_verified boolean,body text,visibility text,likes_enabled boolean,comments_enabled boolean,sharing_enabled boolean,watermark_enabled boolean,download_protection boolean,published_at timestamptz,like_count bigint,comment_count bigint,share_count bigint,viewer_liked boolean,media jsonb)
language plpgsql stable security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'not_authenticated'; end if;
  return query select bp.id,bp.author_id,p.display_name,p.verification_badge,bp.body,bp.visibility,bp.likes_enabled,bp.comments_enabled,bp.sharing_enabled,bp.watermark_enabled,bp.download_protection,bp.published_at,
    (select count(*) from public.blog_likes l where l.post_id=bp.id),(select count(*) from public.blog_comments c where c.post_id=bp.id and c.status='active'),(select count(*) from public.blog_shares s where s.post_id=bp.id),exists(select 1 from public.blog_likes l where l.post_id=bp.id and l.user_id=u),
    coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'path',m.storage_path,'position',m.position,'status',m.status,'kind',m.media_kind,'mimeType',m.mime_type) order by m.position) from public.blog_post_media m where m.post_id=bp.id and m.status<>'removed' and (m.status='approved' or bp.author_id=u or public.is_trust_admin(u))),'[]'::jsonb)
  from public.blog_posts bp join public.profiles p on p.id=bp.author_id and p.status='active'
  where bp.status='active' and (p_author is null or bp.author_id=p_author) and public.can_view_blog_post(bp.id,u)
  order by bp.published_at desc,bp.created_at desc offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,20),1),50);
end; $$;

create or replace function public.get_blog_post(p_post uuid)
returns table(post_id uuid,author_id uuid,author_name text,author_verified boolean,body text,visibility text,likes_enabled boolean,comments_enabled boolean,sharing_enabled boolean,watermark_enabled boolean,download_protection boolean,published_at timestamptz,like_count bigint,comment_count bigint,share_count bigint,viewer_liked boolean,media jsonb,selected_viewer_ids jsonb)
language plpgsql stable security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'not_authenticated'; end if;
  return query select bp.id,bp.author_id,p.display_name,p.verification_badge,bp.body,bp.visibility,bp.likes_enabled,bp.comments_enabled,bp.sharing_enabled,bp.watermark_enabled,bp.download_protection,bp.published_at,
    (select count(*) from public.blog_likes l where l.post_id=bp.id),(select count(*) from public.blog_comments c where c.post_id=bp.id and c.status='active'),(select count(*) from public.blog_shares s where s.post_id=bp.id),exists(select 1 from public.blog_likes l where l.post_id=bp.id and l.user_id=u),
    coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'path',m.storage_path,'position',m.position,'status',m.status,'kind',m.media_kind,'mimeType',m.mime_type) order by m.position) from public.blog_post_media m where m.post_id=bp.id and m.status<>'removed' and (m.status='approved' or bp.author_id=u or public.is_trust_admin(u))),'[]'::jsonb),
    case when bp.author_id=u then coalesce((select jsonb_agg(v.viewer_user_id) from public.blog_post_viewers v where v.post_id=bp.id),'[]'::jsonb) else '[]'::jsonb end
  from public.blog_posts bp join public.profiles p on p.id=bp.author_id where bp.id=p_post and public.can_view_blog_post(bp.id,u) limit 1;
end; $$;

create or replace function public.create_story_draft(p_body text,p_visibility text,p_selected_viewers uuid[],p_watermark_enabled boolean,p_download_protection boolean) returns uuid
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); sid uuid; requested int:=0; inserted int:=0;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.profiles where id=u and status='active') then raise exception 'profile_not_active'; end if;
  if p_visibility not in ('public','friends','selected','private') or char_length(coalesce(p_body,''))>700 then raise exception 'invalid_story'; end if;
  if not public.consume_user_rate_limit(u,'story_day',86400,30) then raise exception 'rate_limited'; end if;
  insert into public.stories(author_id,body,visibility,watermark_enabled,download_protection) values(u,trim(coalesce(p_body,'')),p_visibility,p_watermark_enabled,p_download_protection) returning id into sid;
  if p_visibility='selected' then
    select count(distinct x) into requested from unnest(coalesce(p_selected_viewers,'{}'::uuid[])) x where x<>u;
    insert into public.story_viewers(story_id,viewer_user_id)
    select sid,x from (select distinct x from unnest(coalesce(p_selected_viewers,'{}'::uuid[])) x where x<>u) q where public.can_view_social_profile(x,u) and not exists(select 1 from public.blocks b where (b.blocker_id=u and b.blocked_id=x) or (b.blocker_id=x and b.blocked_id=u));
    get diagnostics inserted=row_count;
    if requested=0 or inserted<>requested then raise exception 'invalid_selected_viewer'; end if;
  end if;
  return sid;
end; $$;
revoke all on function public.create_story_draft(text,text,uuid[],boolean,boolean) from public,anon;
grant execute on function public.create_story_draft(text,text,uuid[],boolean,boolean) to authenticated;

create or replace function public.create_story_media_upload_intent(p_story uuid,p_mime_type text,p_size_bytes bigint)
returns table(intent_id uuid,storage_path text,expires_at timestamptz)
language plpgsql security definer set search_path=public,storage as $$
declare u uuid:=auth.uid(); iid uuid:=gen_random_uuid(); ext text; path text; max_size bigint;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.stories where id=p_story and author_id=u and status='draft') then raise exception 'story_unavailable'; end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp','video/mp4','video/webm') then raise exception 'invalid_media'; end if;
  max_size:=case when p_mime_type like 'image/%' then 8388608 else 52428800 end;
  if p_size_bytes<1 or p_size_bytes>max_size then raise exception 'invalid_media'; end if;
  ext:=case p_mime_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'video/mp4' then 'mp4' else 'webm' end;
  path:=u::text||'/raw-story-'||gen_random_uuid()::text||'.'||ext;
  insert into public.media_upload_intents(id,user_id,bucket,storage_path,kind,mime_type,size_bytes,metadata) values(iid,u,'story-media',path,'story_media',p_mime_type,p_size_bytes,jsonb_build_object('story_id',p_story));
  return query select iid,path,(select m.expires_at from public.media_upload_intents m where m.id=iid);
end; $$;
revoke all on function public.create_story_media_upload_intent(uuid,text,bigint) from public,anon;
grant execute on function public.create_story_media_upload_intent(uuid,text,bigint) to authenticated;

create or replace function public.finalize_story_media_upload(p_intent uuid,p_final_path text,p_status text,p_width integer,p_height integer) returns uuid
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); i public.media_upload_intents%rowtype; sid uuid; mid uuid; kind text;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if p_status not in ('pending','approved','rejected') then raise exception 'invalid_status'; end if;
  select * into i from public.media_upload_intents where id=p_intent and user_id=u and bucket='story-media' and kind='story_media' and status='created' and expires_at>now() for update;
  if not found then raise exception 'upload_intent_invalid'; end if;
  sid:=(i.metadata->>'story_id')::uuid;
  if not exists(select 1 from public.stories where id=sid and author_id=u and status='draft') then raise exception 'story_unavailable'; end if;
  kind:=case when i.mime_type like 'image/%' then 'image' else 'video' end;
  insert into public.story_media(story_id,author_id,storage_path,media_kind,mime_type,status,width,height) values(sid,u,p_final_path,kind,case when kind='image' then 'image/webp' else i.mime_type end,p_status,p_width,p_height)
  on conflict(story_id) do update set storage_path=excluded.storage_path,media_kind=excluded.media_kind,mime_type=excluded.mime_type,status=excluded.status,width=excluded.width,height=excluded.height,updated_at=now() returning id into mid;
  update public.media_upload_intents set status='consumed',consumed_at=now(),metadata=metadata||jsonb_build_object('final_path',p_final_path,'story_media_id',mid) where id=p_intent;
  return mid;
end; $$;
revoke all on function public.finalize_story_media_upload(uuid,text,text,integer,integer) from public,anon;
grant execute on function public.finalize_story_media_upload(uuid,text,text,integer,integer) to authenticated;

create or replace function public.publish_story(p_story uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); text_body text;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  select body into text_body from public.stories where id=p_story and author_id=u and status='draft' for update;
  if not found then raise exception 'story_unavailable'; end if;
  if trim(coalesce(text_body,''))='' and not exists(select 1 from public.story_media where story_id=p_story and status in ('pending','approved')) then raise exception 'story_empty'; end if;
  update public.stories set status='active',published_at=now(),expires_at=now()+interval '24 hours',updated_at=now() where id=p_story;
  perform public.sync_social_mentions('story',p_story,text_body,u,null);
  return jsonb_build_object('ok',true,'storyId',p_story,'expiresAt',now()+interval '24 hours');
end; $$;
revoke all on function public.publish_story(uuid) from public,anon;
grant execute on function public.publish_story(uuid) to authenticated;

create or replace function public.remove_story(p_story uuid) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.stories set status='removed',updated_at=now() where id=p_story and author_id=auth.uid() and status<>'removed';
  if not found then raise exception 'story_unavailable'; end if;
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.remove_story(uuid) from public,anon;
grant execute on function public.remove_story(uuid) to authenticated;

create or replace function public.record_story_view(p_story uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); author uuid; cnt bigint;
begin
  if u is null or not public.can_view_story(p_story,u) then raise exception 'story_unavailable'; end if;
  select author_id into author from public.stories where id=p_story;
  if author<>u then insert into public.story_views(story_id,viewer_user_id,viewed_at) values(p_story,u,now()) on conflict(story_id,viewer_user_id) do update set viewed_at=now(); end if;
  select count(*) into cnt from public.story_views where story_id=p_story;
  return jsonb_build_object('ok',true,'views',cnt);
end; $$;
revoke all on function public.record_story_view(uuid) from public,anon;
grant execute on function public.record_story_view(uuid) to authenticated;

create or replace function public.get_story_feed(p_author uuid default null,p_limit integer default 60)
returns table(story_id uuid,author_id uuid,author_name text,author_verified boolean,handle text,body text,visibility text,watermark_enabled boolean,download_protection boolean,published_at timestamptz,expires_at timestamptz,media_id uuid,storage_path text,media_kind text,mime_type text,media_status text,viewer_seen boolean,view_count bigint)
language plpgsql stable security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'not_authenticated'; end if;
  return query select s.id,s.author_id,p.display_name,p.verification_badge,h.handle,s.body,s.visibility,s.watermark_enabled,s.download_protection,s.published_at,s.expires_at,m.id,m.storage_path,m.media_kind,m.mime_type,m.status,exists(select 1 from public.story_views v where v.story_id=s.id and v.viewer_user_id=u),case when s.author_id=u then (select count(*) from public.story_views v where v.story_id=s.id) else 0 end
  from public.stories s join public.profiles p on p.id=s.author_id left join public.social_handles h on h.user_id=s.author_id left join public.story_media m on m.story_id=s.id and m.status<>'removed'
  where s.status='active' and s.expires_at>now() and (p_author is null or s.author_id=p_author) and public.can_view_story(s.id,u)
  order by s.published_at desc limit least(greatest(coalesce(p_limit,60),1),100);
end; $$;
revoke all on function public.get_story_feed(uuid,integer) from public,anon;
grant execute on function public.get_story_feed(uuid,integer) to authenticated;

create or replace function public.get_social_profile_bundle(p_target uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare u uuid:=auth.uid(); result jsonb;
begin
  if u is null or not public.can_view_social_profile(p_target,u) then raise exception 'profile_unavailable'; end if;
  select jsonb_build_object(
    'profile',jsonb_build_object('id',p.id,'displayName',p.display_name,'bio',p.bio,'genderIdentity',p.gender_identity,'city',p.city,'district',p.district,'countryCode',p.country_code,'languages',p.languages,'intent',p.intent,'occupation',p.occupation,'heightCm',p.height_cm,'verified',p.verification_badge,'lastActiveAt',p.last_active_at),
    'handle',h.handle,
    'followers',(select count(*) from public.social_follows f where f.followed_id=p_target),
    'following',(select count(*) from public.social_follows f where f.follower_id=p_target),
    'viewerFollows',exists(select 1 from public.social_follows f where f.follower_id=u and f.followed_id=p_target),
    'followsViewer',exists(select 1 from public.social_follows f where f.follower_id=p_target and f.followed_id=u),
    'isMatch',public.is_blog_friend(p_target,u),
    'prompts',coalesce((select jsonb_agg(jsonb_build_object('slot',pp.slot,'promptKey',pp.prompt_key,'answer',pp.answer) order by pp.slot) from public.profile_prompts pp where pp.user_id=p_target),'[]'::jsonb),
    'photos',coalesce((select jsonb_agg(jsonb_build_object('id',ph.id,'path',ph.storage_path,'position',ph.position,'primary',ph.is_primary) order by ph.is_primary desc,ph.position) from public.profile_photos ph where ph.user_id=p_target and ph.status='approved'),'[]'::jsonb),
    'activeStories',(select count(*) from public.stories s where s.author_id=p_target and s.status='active' and s.expires_at>now() and public.can_view_story(s.id,u))
  ) into result from public.profiles p left join public.social_handles h on h.user_id=p.id where p.id=p_target;
  return result;
end; $$;
revoke all on function public.get_social_profile_bundle(uuid) from public,anon;
grant execute on function public.get_social_profile_bundle(uuid) to authenticated;

create or replace function public.get_social_list(p_target uuid,p_mode text,p_limit integer default 100)
returns table(user_id uuid,display_name text,verified boolean,handle text,primary_photo_path text,is_match boolean)
language plpgsql stable security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
  if u is null or not public.can_view_social_profile(p_target,u) or p_mode not in ('followers','following') then raise exception 'invalid_request'; end if;
  return query
  select p.id,p.display_name,p.verification_badge,h.handle,(select ph.storage_path from public.profile_photos ph where ph.user_id=p.id and ph.status='approved' order by ph.is_primary desc,ph.position limit 1),public.is_blog_friend(p.id,u)
  from public.profiles p left join public.social_handles h on h.user_id=p.id
  where p.status='active' and public.can_view_social_profile(p.id,u) and ((p_mode='followers' and exists(select 1 from public.social_follows f where f.followed_id=p_target and f.follower_id=p.id)) or (p_mode='following' and exists(select 1 from public.social_follows f where f.follower_id=p_target and f.followed_id=p.id)))
  order by p.last_active_at desc nulls last limit least(greatest(coalesce(p_limit,100),1),200);
end; $$;
revoke all on function public.get_social_list(uuid,text,integer) from public,anon;
grant execute on function public.get_social_list(uuid,text,integer) to authenticated;

create or replace function public.report_social_content(p_type text,p_content uuid,p_category text,p_description text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); target uuid; postid uuid; rid uuid;
begin
  if u is null then raise exception 'not_authenticated'; end if;
  if p_category not in ('fake_profile','harassment','scam','sexual_content','minor_risk','paid_sex','impersonation','threat','spam','other') then raise exception 'invalid_category'; end if;
  if p_type='profile' then target:=p_content; if not public.can_view_social_profile(target,u) then raise exception 'content_unavailable'; end if;
  elsif p_type='blog_post' then select author_id into target from public.blog_posts where id=p_content; postid:=p_content; if target is null or not public.can_view_blog_post(p_content,u) then raise exception 'content_unavailable'; end if;
  elsif p_type='blog_comment' then select c.user_id,c.post_id into target,postid from public.blog_comments c where c.id=p_content and c.status='active'; if target is null or not public.can_view_blog_post(postid,u) then raise exception 'content_unavailable'; end if;
  elsif p_type='story' then select author_id into target from public.stories where id=p_content; if target is null or not public.can_view_story(p_content,u) then raise exception 'content_unavailable'; end if;
  else raise exception 'invalid_type'; end if;
  if target=u then raise exception 'invalid_target'; end if;
  insert into public.reports(reporter_id,reported_user_id,category,description,blog_post_id,blog_comment_id,story_id)
  values(u,target,p_category,left(p_description,2000),case when p_type='blog_post' then p_content when p_type='blog_comment' then postid else null end,case when p_type='blog_comment' then p_content else null end,case when p_type='story' then p_content else null end) returning id into rid;
  return rid;
end; $$;
revoke all on function public.report_social_content(text,uuid,text,text) from public,anon;
grant execute on function public.report_social_content(text,uuid,text,text) to authenticated;

drop policy if exists story_media_owner_insert on storage.objects;
create policy story_media_owner_insert on storage.objects for insert to authenticated with check(bucket_id='story-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists story_media_protected_select on storage.objects;
create policy story_media_protected_select on storage.objects for select to authenticated using(bucket_id='story-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_trust_admin(auth.uid()) or exists(select 1 from public.story_media sm where sm.storage_path=storage.objects.name and sm.status='approved' and public.can_view_story(sm.story_id,auth.uid()))));
drop policy if exists story_media_owner_delete on storage.objects;
create policy story_media_owner_delete on storage.objects for delete to authenticated using(bucket_id='story-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_trust_admin(auth.uid())));

comment on table public.social_follows is 'One-way social follows; does not grant Match-only blog visibility.';
comment on table public.stories is 'Ephemeral 24-hour social content with server-enforced audience controls.';
