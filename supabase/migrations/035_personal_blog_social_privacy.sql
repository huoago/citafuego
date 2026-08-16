-- CitaFuego personal blog: privacy-aware posts, social actions and protected media.
-- Additive migration after 034_device_only_chat.sql.

alter table public.media_upload_intents drop constraint if exists media_upload_intents_bucket_check;
alter table public.media_upload_intents add constraint media_upload_intents_bucket_check check (bucket in ('profile-photos','verification-selfies','blog-media'));
alter table public.media_upload_intents drop constraint if exists media_upload_intents_kind_check;
alter table public.media_upload_intents add constraint media_upload_intents_kind_check check (kind in ('profile_photo','verification_selfie','blog_image'));

alter table public.user_notifications drop constraint if exists user_notifications_kind_check;
alter table public.user_notifications add constraint user_notifications_kind_check check (kind in ('like','match','message','boost','random','system','blog'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('blog-media','blog-media',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.blog_settings(
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_visibility text not null default 'friends' check(default_visibility in ('public','friends','selected','private')),
  likes_enabled boolean not null default true,
  comments_enabled boolean not null default true,
  sharing_enabled boolean not null default true,
  watermark_enabled boolean not null default true,
  download_protection boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.blog_posts(
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '' check(char_length(body)<=4000),
  visibility text not null default 'friends' check(visibility in ('public','friends','selected','private')),
  likes_enabled boolean not null default true,
  comments_enabled boolean not null default true,
  sharing_enabled boolean not null default true,
  watermark_enabled boolean not null default true,
  download_protection boolean not null default true,
  status text not null default 'draft' check(status in ('draft','active','archived','removed')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_author_published_idx on public.blog_posts(author_id,published_at desc);
create index if not exists blog_posts_active_published_idx on public.blog_posts(published_at desc) where status='active';

create table if not exists public.blog_post_viewers(
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,viewer_user_id)
);
create index if not exists blog_post_viewers_viewer_idx on public.blog_post_viewers(viewer_user_id,post_id);

create table if not exists public.blog_post_media(
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  position smallint not null default 0 check(position between 0 and 5),
  status text not null default 'pending' check(status in ('pending','approved','rejected','removed')),
  width integer check(width is null or width between 1 and 10000),
  height integer check(height is null or height between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(post_id,position)
);
create index if not exists blog_media_post_idx on public.blog_post_media(post_id,position);
create index if not exists blog_media_pending_idx on public.blog_post_media(created_at) where status='pending';

create table if not exists public.blog_likes(
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create index if not exists blog_likes_user_idx on public.blog_likes(user_id,created_at desc);

create table if not exists public.blog_comments(
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 1500),
  status text not null default 'active' check(status in ('active','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_comments_post_created_idx on public.blog_comments(post_id,created_at);

create table if not exists public.blog_shares(
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists blog_shares_post_created_idx on public.blog_shares(post_id,created_at desc);

alter table public.blog_settings enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_post_viewers enable row level security;
alter table public.blog_post_media enable row level security;
alter table public.blog_likes enable row level security;
alter table public.blog_comments enable row level security;
alter table public.blog_shares enable row level security;

create or replace function public.is_blog_friend(p_author uuid,p_viewer uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select p_author is not null and p_viewer is not null and exists(
    select 1 from public.matches m
    where m.status='active' and ((m.user_a=p_author and m.user_b=p_viewer) or (m.user_a=p_viewer and m.user_b=p_author))
  );
$$;
revoke all on function public.is_blog_friend(uuid,uuid) from public,anon;
grant execute on function public.is_blog_friend(uuid,uuid) to authenticated;

create or replace function public.can_view_blog_post(p_post uuid,p_viewer uuid default auth.uid()) returns boolean
language plpgsql stable security definer set search_path=public as $$
declare v_post public.blog_posts%rowtype;
begin
  if p_viewer is null then return false; end if;
  select * into v_post from public.blog_posts where id=p_post;
  if not found or v_post.status='removed' then return false; end if;
  if v_post.author_id=p_viewer then return true; end if;
  if v_post.status<>'active' then return false; end if;
  if not exists(select 1 from public.profiles p where p.id=p_viewer and p.status='active') then return false; end if;
  if not exists(select 1 from public.profiles p where p.id=v_post.author_id and p.status='active') then return false; end if;
  if exists(select 1 from public.blocks b where (b.blocker_id=v_post.author_id and b.blocked_id=p_viewer) or (b.blocker_id=p_viewer and b.blocked_id=v_post.author_id)) then return false; end if;
  if v_post.visibility='public' then return true; end if;
  if v_post.visibility='friends' then return public.is_blog_friend(v_post.author_id,p_viewer); end if;
  if v_post.visibility='selected' then return exists(select 1 from public.blog_post_viewers v where v.post_id=p_post and v.viewer_user_id=p_viewer); end if;
  return false;
end; $$;
revoke all on function public.can_view_blog_post(uuid,uuid) from public,anon;
grant execute on function public.can_view_blog_post(uuid,uuid) to authenticated;

-- Self-only settings read. All writes use validated RPCs.
drop policy if exists blog_settings_self_read on public.blog_settings;
create policy blog_settings_self_read on public.blog_settings for select to authenticated using(user_id=auth.uid());

-- Direct post/media reads are still protected by the same server-side visibility predicate.
drop policy if exists blog_posts_visible_read on public.blog_posts;
create policy blog_posts_visible_read on public.blog_posts for select to authenticated using(public.can_view_blog_post(id,auth.uid()) or public.is_trust_admin(auth.uid()));

drop policy if exists blog_viewers_participant_read on public.blog_post_viewers;
create policy blog_viewers_participant_read on public.blog_post_viewers for select to authenticated using(
  viewer_user_id=auth.uid() or public.is_trust_admin(auth.uid()) or exists(select 1 from public.blog_posts p where p.id=post_id and p.author_id=auth.uid())
);

drop policy if exists blog_media_visible_read on public.blog_post_media;
create policy blog_media_visible_read on public.blog_post_media for select to authenticated using(
  author_id=auth.uid() or public.is_trust_admin(auth.uid()) or (status='approved' and public.can_view_blog_post(post_id,auth.uid()))
);

grant select on public.blog_settings,public.blog_posts,public.blog_post_viewers,public.blog_post_media to authenticated;
revoke insert,update,delete on public.blog_settings,public.blog_posts,public.blog_post_viewers,public.blog_post_media,public.blog_likes,public.blog_comments,public.blog_shares from authenticated,anon;

create or replace function public.save_blog_settings(
  p_default_visibility text,p_likes_enabled boolean,p_comments_enabled boolean,p_sharing_enabled boolean,p_watermark_enabled boolean,p_download_protection boolean
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_default_visibility not in ('public','friends','selected','private') then raise exception 'invalid_visibility'; end if;
  insert into public.blog_settings(user_id,default_visibility,likes_enabled,comments_enabled,sharing_enabled,watermark_enabled,download_protection,updated_at)
  values(v_user,p_default_visibility,p_likes_enabled,p_comments_enabled,p_sharing_enabled,p_watermark_enabled,p_download_protection,now())
  on conflict(user_id) do update set default_visibility=excluded.default_visibility,likes_enabled=excluded.likes_enabled,comments_enabled=excluded.comments_enabled,sharing_enabled=excluded.sharing_enabled,watermark_enabled=excluded.watermark_enabled,download_protection=excluded.download_protection,updated_at=now();
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.save_blog_settings(text,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.save_blog_settings(text,boolean,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.create_blog_draft(
  p_body text,p_visibility text,p_selected_viewers uuid[],p_likes_enabled boolean,p_comments_enabled boolean,p_sharing_enabled boolean,p_watermark_enabled boolean,p_download_protection boolean
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_post uuid; v_requested integer:=0; v_inserted integer:=0;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.profiles where id=v_user and status='active') then raise exception 'profile_not_active'; end if;
  if p_visibility not in ('public','friends','selected','private') then raise exception 'invalid_visibility'; end if;
  if char_length(coalesce(p_body,''))>4000 then raise exception 'body_too_long'; end if;
  if not public.consume_user_rate_limit(v_user,'blog_post_day',86400,20) then raise exception 'rate_limited'; end if;
  insert into public.blog_posts(author_id,body,visibility,likes_enabled,comments_enabled,sharing_enabled,watermark_enabled,download_protection)
  values(v_user,trim(coalesce(p_body,'')),p_visibility,p_likes_enabled,p_comments_enabled,p_sharing_enabled,p_watermark_enabled,p_download_protection)
  returning id into v_post;
  if p_visibility='selected' then
    select count(distinct x) into v_requested from unnest(coalesce(p_selected_viewers,'{}'::uuid[])) x where x<>v_user;
    insert into public.blog_post_viewers(post_id,viewer_user_id)
    select v_post,x from (select distinct x from unnest(coalesce(p_selected_viewers,'{}'::uuid[])) x where x<>v_user) q
    where public.is_blog_friend(v_user,x)
      and not exists(select 1 from public.blocks b where (b.blocker_id=v_user and b.blocked_id=x) or (b.blocker_id=x and b.blocked_id=v_user));
    get diagnostics v_inserted=row_count;
    if v_requested=0 or v_inserted<>v_requested then raise exception 'invalid_selected_viewer'; end if;
  end if;
  return v_post;
end; $$;
revoke all on function public.create_blog_draft(text,text,uuid[],boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.create_blog_draft(text,text,uuid[],boolean,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.update_blog_post_privacy(
  p_post uuid,p_visibility text,p_selected_viewers uuid[],p_likes_enabled boolean,p_comments_enabled boolean,p_sharing_enabled boolean,p_download_protection boolean
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_requested integer:=0; v_inserted integer:=0;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_visibility not in ('public','friends','selected','private') then raise exception 'invalid_visibility'; end if;
  if not exists(select 1 from public.blog_posts where id=p_post and author_id=v_user and status in ('draft','active','archived')) then raise exception 'post_unavailable'; end if;
  update public.blog_posts set visibility=p_visibility,likes_enabled=p_likes_enabled,comments_enabled=p_comments_enabled,sharing_enabled=p_sharing_enabled,download_protection=p_download_protection,updated_at=now() where id=p_post and author_id=v_user;
  delete from public.blog_post_viewers where post_id=p_post;
  if p_visibility='selected' then
    select count(distinct x) into v_requested from unnest(coalesce(p_selected_viewers,'{}'::uuid[])) x where x<>v_user;
    insert into public.blog_post_viewers(post_id,viewer_user_id)
    select p_post,x from (select distinct x from unnest(coalesce(p_selected_viewers,'{}'::uuid[])) x where x<>v_user) q
    where public.is_blog_friend(v_user,x)
      and not exists(select 1 from public.blocks b where (b.blocker_id=v_user and b.blocked_id=x) or (b.blocker_id=x and b.blocked_id=v_user));
    get diagnostics v_inserted=row_count;
    if v_requested=0 or v_inserted<>v_requested then raise exception 'invalid_selected_viewer'; end if;
  end if;
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.update_blog_post_privacy(uuid,text,uuid[],boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.update_blog_post_privacy(uuid,text,uuid[],boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.publish_blog_post(p_post uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_body text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select body into v_body from public.blog_posts where id=p_post and author_id=v_user and status='draft' for update;
  if not found then raise exception 'post_unavailable'; end if;
  if trim(coalesce(v_body,''))='' and not exists(select 1 from public.blog_post_media m where m.post_id=p_post and m.status in ('pending','approved')) then raise exception 'post_empty'; end if;
  update public.blog_posts set status='active',published_at=now(),updated_at=now() where id=p_post;
  return jsonb_build_object('ok',true,'postId',p_post);
end; $$;
revoke all on function public.publish_blog_post(uuid) from public,anon;
grant execute on function public.publish_blog_post(uuid) to authenticated;

create or replace function public.remove_blog_post(p_post uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.blog_posts set status='removed',updated_at=now() where id=p_post and author_id=auth.uid() and status<>'removed';
  if not found then raise exception 'post_unavailable'; end if;
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.remove_blog_post(uuid) from public,anon;
grant execute on function public.remove_blog_post(uuid) to authenticated;

create or replace function public.create_blog_media_upload_intent(p_post uuid,p_mime_type text,p_size_bytes bigint,p_position smallint)
returns table(intent_id uuid,storage_path text,expires_at timestamptz)
language plpgsql security definer set search_path=public,storage as $$
declare v_user uuid:=auth.uid(); v_id uuid:=gen_random_uuid(); v_ext text; v_path text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.blog_posts where id=p_post and author_id=v_user and status='draft') then raise exception 'post_unavailable'; end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp') or p_size_bytes<1 or p_size_bytes>8388608 then raise exception 'invalid_media'; end if;
  if p_position<0 or p_position>5 then raise exception 'invalid_position'; end if;
  v_ext:=case p_mime_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else 'webp' end;
  v_path:=v_user::text||'/raw-blog-'||gen_random_uuid()::text||'.'||v_ext;
  insert into public.media_upload_intents(id,user_id,bucket,storage_path,kind,mime_type,size_bytes,metadata)
  values(v_id,v_user,'blog-media',v_path,'blog_image',p_mime_type,p_size_bytes,jsonb_build_object('post_id',p_post,'position',p_position));
  return query select v_id,v_path,(select m.expires_at from public.media_upload_intents m where m.id=v_id);
end; $$;
revoke all on function public.create_blog_media_upload_intent(uuid,text,bigint,smallint) from public,anon;
grant execute on function public.create_blog_media_upload_intent(uuid,text,bigint,smallint) to authenticated;

create or replace function public.finalize_blog_media_upload(p_intent uuid,p_final_path text,p_status text,p_width integer,p_height integer) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_intent public.media_upload_intents%rowtype; v_post uuid; v_position smallint; v_media uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_status not in ('pending','approved','rejected') then raise exception 'invalid_status'; end if;
  select * into v_intent from public.media_upload_intents where id=p_intent and user_id=v_user and bucket='blog-media' and kind='blog_image' and status='created' and expires_at>now() for update;
  if not found then raise exception 'upload_intent_invalid'; end if;
  v_post:=(v_intent.metadata->>'post_id')::uuid; v_position:=coalesce((v_intent.metadata->>'position')::smallint,0);
  if not exists(select 1 from public.blog_posts where id=v_post and author_id=v_user and status='draft') then raise exception 'post_unavailable'; end if;
  if p_final_path not like v_user::text||'/%' then raise exception 'invalid_storage_path'; end if;
  update public.blog_post_media set status='removed',updated_at=now() where post_id=v_post and position=v_position and status<>'removed';
  insert into public.blog_post_media(post_id,author_id,storage_path,position,status,width,height)
  values(v_post,v_user,p_final_path,v_position,p_status,p_width,p_height) returning id into v_media;
  update public.media_upload_intents set status='consumed',consumed_at=now(),metadata=metadata||jsonb_build_object('sanitized_path',p_final_path,'blog_media_id',v_media) where id=p_intent;
  return v_media;
end; $$;
revoke all on function public.finalize_blog_media_upload(uuid,text,text,integer,integer) from public,anon;
grant execute on function public.finalize_blog_media_upload(uuid,text,text,integer,integer) to authenticated;

create or replace function public.get_blog_feed(p_author uuid default null,p_offset integer default 0,p_limit integer default 20)
returns table(
  post_id uuid,author_id uuid,author_name text,author_verified boolean,body text,visibility text,
  likes_enabled boolean,comments_enabled boolean,sharing_enabled boolean,watermark_enabled boolean,download_protection boolean,
  published_at timestamptz,like_count bigint,comment_count bigint,share_count bigint,viewer_liked boolean,media jsonb
)
language plpgsql stable security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  return query
  select bp.id,bp.author_id,p.display_name,p.verification_badge,bp.body,bp.visibility,bp.likes_enabled,bp.comments_enabled,bp.sharing_enabled,bp.watermark_enabled,bp.download_protection,bp.published_at,
    (select count(*) from public.blog_likes l where l.post_id=bp.id),
    (select count(*) from public.blog_comments c where c.post_id=bp.id and c.status='active'),
    (select count(*) from public.blog_shares s where s.post_id=bp.id),
    exists(select 1 from public.blog_likes l where l.post_id=bp.id and l.user_id=v_user),
    coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'path',m.storage_path,'position',m.position,'status',m.status) order by m.position)
      from public.blog_post_media m where m.post_id=bp.id and m.status<>'removed' and (m.status='approved' or bp.author_id=v_user or public.is_trust_admin(v_user))),'[]'::jsonb)
  from public.blog_posts bp join public.profiles p on p.id=bp.author_id and p.status='active'
  where bp.status='active' and (p_author is null or bp.author_id=p_author) and public.can_view_blog_post(bp.id,v_user)
  order by bp.published_at desc,bp.created_at desc
  offset greatest(coalesce(p_offset,0),0) limit least(greatest(coalesce(p_limit,20),1),50);
end; $$;
revoke all on function public.get_blog_feed(uuid,integer,integer) from public,anon;
grant execute on function public.get_blog_feed(uuid,integer,integer) to authenticated;

create or replace function public.get_blog_post(p_post uuid)
returns table(
  post_id uuid,author_id uuid,author_name text,author_verified boolean,body text,visibility text,
  likes_enabled boolean,comments_enabled boolean,sharing_enabled boolean,watermark_enabled boolean,download_protection boolean,
  published_at timestamptz,like_count bigint,comment_count bigint,share_count bigint,viewer_liked boolean,media jsonb,selected_viewer_ids jsonb
)
language plpgsql stable security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  return query
  select bp.id,bp.author_id,p.display_name,p.verification_badge,bp.body,bp.visibility,bp.likes_enabled,bp.comments_enabled,bp.sharing_enabled,bp.watermark_enabled,bp.download_protection,bp.published_at,
    (select count(*) from public.blog_likes l where l.post_id=bp.id),
    (select count(*) from public.blog_comments c where c.post_id=bp.id and c.status='active'),
    (select count(*) from public.blog_shares s where s.post_id=bp.id),
    exists(select 1 from public.blog_likes l where l.post_id=bp.id and l.user_id=v_user),
    coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'path',m.storage_path,'position',m.position,'status',m.status) order by m.position)
      from public.blog_post_media m where m.post_id=bp.id and m.status<>'removed' and (m.status='approved' or bp.author_id=v_user or public.is_trust_admin(v_user))),'[]'::jsonb),
    case when bp.author_id=v_user then coalesce((select jsonb_agg(v.viewer_user_id) from public.blog_post_viewers v where v.post_id=bp.id),'[]'::jsonb) else '[]'::jsonb end
  from public.blog_posts bp join public.profiles p on p.id=bp.author_id
  where bp.id=p_post and public.can_view_blog_post(bp.id,v_user)
  limit 1;
end; $$;
revoke all on function public.get_blog_post(uuid) from public,anon;
grant execute on function public.get_blog_post(uuid) to authenticated;

create or replace function public.get_blog_comments(p_post uuid,p_limit integer default 100)
returns table(comment_id uuid,user_id uuid,display_name text,verified boolean,body text,created_at timestamptz,can_delete boolean)
language plpgsql stable security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_author uuid;
begin
  if v_user is null or not public.can_view_blog_post(p_post,v_user) then raise exception 'post_unavailable'; end if;
  select author_id into v_author from public.blog_posts where id=p_post;
  return query select c.id,c.user_id,p.display_name,p.verification_badge,c.body,c.created_at,(c.user_id=v_user or v_author=v_user or public.is_trust_admin(v_user))
  from public.blog_comments c join public.profiles p on p.id=c.user_id
  where c.post_id=p_post and c.status='active'
    and not exists(select 1 from public.blocks b where (b.blocker_id=v_user and b.blocked_id=c.user_id) or (b.blocker_id=c.user_id and b.blocked_id=v_user))
  order by c.created_at asc limit least(greatest(coalesce(p_limit,100),1),200);
end; $$;
revoke all on function public.get_blog_comments(uuid,integer) from public,anon;
grant execute on function public.get_blog_comments(uuid,integer) to authenticated;

create or replace function public.toggle_blog_like(p_post uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_post public.blog_posts%rowtype; v_liked boolean; v_count bigint;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not public.can_view_blog_post(p_post,v_user) then raise exception 'post_unavailable'; end if;
  select * into v_post from public.blog_posts where id=p_post and status='active';
  if not found or not v_post.likes_enabled then raise exception 'likes_disabled'; end if;
  if v_post.author_id=v_user then raise exception 'self_like_not_allowed'; end if;
  if exists(select 1 from public.blog_likes where post_id=p_post and user_id=v_user) then
    delete from public.blog_likes where post_id=p_post and user_id=v_user; v_liked:=false;
  else
    insert into public.blog_likes(post_id,user_id) values(p_post,v_user); v_liked:=true;
    insert into public.user_notifications(user_id,kind,title,body,href,actor_user_id)
    values(v_post.author_id,'blog','A alguien le gustó tu publicación','Nueva actividad en tu blog.','/blog/'||p_post::text,v_user);
  end if;
  select count(*) into v_count from public.blog_likes where post_id=p_post;
  return jsonb_build_object('ok',true,'liked',v_liked,'count',v_count);
end; $$;
revoke all on function public.toggle_blog_like(uuid) from public,anon;
grant execute on function public.toggle_blog_like(uuid) to authenticated;

create or replace function public.add_blog_comment(p_post uuid,p_body text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_post public.blog_posts%rowtype; v_id uuid; v_count bigint;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not public.can_view_blog_post(p_post,v_user) then raise exception 'post_unavailable'; end if;
  select * into v_post from public.blog_posts where id=p_post and status='active';
  if not found or not v_post.comments_enabled then raise exception 'comments_disabled'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 1500 then raise exception 'invalid_comment'; end if;
  if not public.consume_user_rate_limit(v_user,'blog_comment_minute',60,20) then raise exception 'rate_limited'; end if;
  insert into public.blog_comments(post_id,user_id,body) values(p_post,v_user,trim(p_body)) returning id into v_id;
  if v_post.author_id<>v_user then
    insert into public.user_notifications(user_id,kind,title,body,href,actor_user_id)
    values(v_post.author_id,'blog','Nuevo comentario en tu blog','Abre la publicación para verlo.','/blog/'||p_post::text,v_user);
  end if;
  select count(*) into v_count from public.blog_comments where post_id=p_post and status='active';
  return jsonb_build_object('ok',true,'commentId',v_id,'count',v_count);
end; $$;
revoke all on function public.add_blog_comment(uuid,text) from public,anon;
grant execute on function public.add_blog_comment(uuid,text) to authenticated;

create or replace function public.remove_blog_comment(p_comment uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_post uuid; v_comment_user uuid; v_author uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select c.post_id,c.user_id,p.author_id into v_post,v_comment_user,v_author from public.blog_comments c join public.blog_posts p on p.id=c.post_id where c.id=p_comment and c.status='active';
  if not found or not (v_comment_user=v_user or v_author=v_user or public.is_trust_admin(v_user)) then raise exception 'forbidden'; end if;
  update public.blog_comments set status='removed',updated_at=now() where id=p_comment;
  return jsonb_build_object('ok',true,'postId',v_post);
end; $$;
revoke all on function public.remove_blog_comment(uuid) from public,anon;
grant execute on function public.remove_blog_comment(uuid) to authenticated;

create or replace function public.record_blog_share(p_post uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_post public.blog_posts%rowtype; v_count bigint;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not public.can_view_blog_post(p_post,v_user) then raise exception 'post_unavailable'; end if;
  select * into v_post from public.blog_posts where id=p_post and status='active';
  if not found or not v_post.sharing_enabled then raise exception 'sharing_disabled'; end if;
  if not public.consume_user_rate_limit(v_user,'blog_share_minute',60,30) then raise exception 'rate_limited'; end if;
  insert into public.blog_shares(post_id,user_id) values(p_post,v_user);
  select count(*) into v_count from public.blog_shares where post_id=p_post;
  return jsonb_build_object('ok',true,'count',v_count);
end; $$;
revoke all on function public.record_blog_share(uuid) from public,anon;
grant execute on function public.record_blog_share(uuid) to authenticated;

create or replace function public.review_blog_media(p_media uuid,p_decision text,p_reason text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_admin uuid:=auth.uid(); v_media public.blog_post_media%rowtype;
begin
  if not public.is_trust_admin(v_admin) then raise exception 'forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_decision'; end if;
  select * into v_media from public.blog_post_media where id=p_media and status='pending' for update;
  if not found then raise exception 'not_found'; end if;
  update public.blog_post_media set status=p_decision,updated_at=now() where id=p_media;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(v_admin,'blog_media_'||p_decision,'blog_media',p_media::text,p_reason,jsonb_build_object('status',v_media.status),jsonb_build_object('status',p_decision));
  return jsonb_build_object('ok',true,'storagePath',v_media.storage_path,'postId',v_media.post_id);
end; $$;
revoke all on function public.review_blog_media(uuid,text,text) from public,anon,authenticated;
grant execute on function public.review_blog_media(uuid,text,text) to authenticated;

-- Private media: owners can upload/read their own objects, Trust & Safety can review,
-- and approved objects are readable only when the post visibility predicate passes.
drop policy if exists blog_media_owner_insert on storage.objects;
create policy blog_media_owner_insert on storage.objects for insert to authenticated with check(
  bucket_id='blog-media' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists blog_media_protected_select on storage.objects;
create policy blog_media_protected_select on storage.objects for select to authenticated using(
  bucket_id='blog-media' and (
    (storage.foldername(name))[1]=auth.uid()::text or public.is_trust_admin(auth.uid()) or exists(
      select 1 from public.blog_post_media m where m.storage_path=storage.objects.name and m.status='approved' and public.can_view_blog_post(m.post_id,auth.uid())
    )
  )
);
drop policy if exists blog_media_owner_delete on storage.objects;
create policy blog_media_owner_delete on storage.objects for delete to authenticated using(
  bucket_id='blog-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_trust_admin(auth.uid()))
);

comment on table public.blog_posts is 'Personal blog posts with per-post server-enforced audience controls.';
comment on table public.blog_post_media is 'Private blog media. Only watermarked/sanitized final objects should be referenced here.';
