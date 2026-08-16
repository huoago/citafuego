-- Make blog media retries idempotent per post position.
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
  insert into public.blog_post_media(post_id,author_id,storage_path,position,status,width,height)
  values(v_post,v_user,p_final_path,v_position,p_status,p_width,p_height)
  on conflict(post_id,position) do update set author_id=excluded.author_id,storage_path=excluded.storage_path,status=excluded.status,width=excluded.width,height=excluded.height,updated_at=now()
  returning id into v_media;
  update public.media_upload_intents set status='consumed',consumed_at=now(),metadata=metadata||jsonb_build_object('sanitized_path',p_final_path,'blog_media_id',v_media) where id=p_intent;
  return v_media;
end; $$;
revoke all on function public.finalize_blog_media_upload(uuid,text,text,integer,integer) from public,anon;
grant execute on function public.finalize_blog_media_upload(uuid,text,text,integer,integer) to authenticated;
