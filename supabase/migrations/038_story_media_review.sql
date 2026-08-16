create or replace function public.review_story_media(p_media uuid,p_decision text,p_reason text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_admin uuid:=auth.uid(); v_media public.story_media%rowtype;
begin
  if not public.is_trust_admin(v_admin) then raise exception 'forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_decision'; end if;
  select * into v_media from public.story_media where id=p_media and status='pending' for update;
  if not found then raise exception 'not_found'; end if;
  update public.story_media set status=p_decision,updated_at=now() where id=p_media;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(v_admin,'story_media_'||p_decision,'story_media',p_media::text,p_reason,jsonb_build_object('status',v_media.status),jsonb_build_object('status',p_decision));
  return jsonb_build_object('ok',true,'storagePath',v_media.storage_path,'storyId',v_media.story_id);
end; $$;
revoke all on function public.review_story_media(uuid,text,text) from public,anon,authenticated;
grant execute on function public.review_story_media(uuid,text,text) to authenticated;
