-- Atomic service-side finalizers for sanitized uploads.
create or replace function public.finalize_profile_photo_upload(p_user uuid,p_intent uuid,p_final_path text,p_status public.photo_status)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_intent public.media_upload_intents%rowtype; v_photo uuid; v_pos smallint; v_primary boolean;
begin
  select * into v_intent from public.media_upload_intents where id=p_intent and user_id=p_user and kind='profile_photo' and status='created' and expires_at>now() for update;
  if not found then raise exception 'upload_intent_invalid'; end if;
  v_pos:=coalesce((v_intent.metadata->>'position')::smallint,0); v_primary:=coalesce((v_intent.metadata->>'is_primary')::boolean,false);
  update public.profile_photos set status='removed',is_primary=false where user_id=p_user and position=v_pos and status<>'removed';
  if v_primary then update public.profile_photos set is_primary=false where user_id=p_user; end if;
  insert into public.profile_photos(user_id,storage_path,position,is_primary,status) values(p_user,p_final_path,v_pos,v_primary,p_status) returning id into v_photo;
  update public.media_upload_intents set status='consumed',consumed_at=now(),metadata=metadata||jsonb_build_object('sanitized_path',p_final_path) where id=p_intent;
  perform public.refresh_profile_activation_for(p_user);
  return v_photo;
end; $$;
revoke all on function public.finalize_profile_photo_upload(uuid,uuid,text,public.photo_status) from public,authenticated;

create or replace function public.finalize_verification_submission(p_user uuid,p_intent uuid,p_session uuid,p_final_path text,p_auto_verified boolean default false)
returns text language plpgsql security definer set search_path=public as $$
declare v_intent public.media_upload_intents%rowtype; v_session public.verification_sessions%rowtype; v_status text;
begin
  select * into v_intent from public.media_upload_intents where id=p_intent and user_id=p_user and kind='verification_selfie' and status='created' and expires_at>now() for update;
  if not found then raise exception 'verification_intent_invalid'; end if;
  if coalesce(v_intent.metadata->>'verification_session_id','') <> p_session::text then raise exception 'verification_session_mismatch'; end if;
  select * into v_session from public.verification_sessions where id=p_session and user_id=p_user and status='pending' for update;
  if not found then raise exception 'verification_session_invalid'; end if;
  if now()-v_session.started_at>interval '15 minutes' then update public.verification_sessions set status='expired',completed_at=now(),reason_code='challenge_expired' where id=p_session; raise exception 'verification_session_expired'; end if;
  v_status:=case when p_auto_verified then 'verified' else 'pending' end;
  update public.verification_sessions set status=v_status,completed_at=case when p_auto_verified then now() else null end,confidence=case when p_auto_verified then 1 else null end,metadata=metadata||jsonb_build_object('stage',case when p_auto_verified then 'completed' else 'submitted' end,'selfie_path',p_final_path,'submitted_at',now()) where id=p_session;
  update public.media_upload_intents set status='consumed',consumed_at=now(),metadata=metadata||jsonb_build_object('sanitized_path',p_final_path) where id=p_intent;
  if p_auto_verified then update public.profiles set verification_badge=true where id=p_user; perform public.refresh_profile_activation_for(p_user); end if;
  return v_status;
end; $$;
revoke all on function public.finalize_verification_submission(uuid,uuid,uuid,text,boolean) from public,authenticated;

grant execute on function public.finalize_profile_photo_upload(uuid, uuid, text, public.photo_status) to service_role;
grant execute on function public.finalize_verification_submission(uuid, uuid, uuid, text, boolean) to service_role;
