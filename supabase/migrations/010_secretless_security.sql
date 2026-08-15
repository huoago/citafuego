-- CitaFuego Sprint 2 + secretless server architecture

create or replace function public.is_trust_admin(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select p_user is not null and exists (
    select 1 from public.admin_user_roles aur
    where aur.user_id=p_user and aur.role_id in ('super_admin','trust_safety')
  );
$$;
revoke all on function public.is_trust_admin(uuid) from public;
grant execute on function public.is_trust_admin(uuid) to authenticated;

-- Public legal versions are safe config and needed before authentication.
drop policy if exists legal_versions_public_read on public.legal_document_versions;
alter table public.legal_document_versions enable row level security;
create policy legal_versions_public_read on public.legal_document_versions
for select to anon,authenticated using (true);

drop policy if exists admin_roles_self_read on public.admin_user_roles;
create policy admin_roles_self_read on public.admin_user_roles
for select to authenticated using (user_id=auth.uid());

drop policy if exists admin_photo_review_read on public.profile_photos;
create policy admin_photo_review_read on public.profile_photos
for select to authenticated using (public.is_trust_admin(auth.uid()));

drop policy if exists admin_verification_read on public.verification_sessions;
create policy admin_verification_read on public.verification_sessions
for select to authenticated using (public.is_trust_admin(auth.uid()));

-- Storage: owner access to private objects, plus approved-profile visibility and trust/safety evidence review.
drop policy if exists profile_photo_owner_insert on storage.objects;
create policy profile_photo_owner_insert on storage.objects
for insert to authenticated
with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists profile_photo_owner_select on storage.objects;
create policy profile_photo_owner_select on storage.objects
for select to authenticated
using (
  bucket_id='profile-photos' and (
    (storage.foldername(name))[1]=auth.uid()::text
    or public.is_trust_admin(auth.uid())
    or exists (
      select 1 from public.profile_photos pp
      join public.profiles p on p.id=pp.user_id
      where pp.storage_path=storage.objects.name and pp.status='approved' and p.status='active'
    )
  )
);

drop policy if exists profile_photo_owner_delete on storage.objects;
create policy profile_photo_owner_delete on storage.objects
for delete to authenticated
using (bucket_id='profile-photos' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_trust_admin(auth.uid())));

drop policy if exists verification_selfie_owner_insert on storage.objects;
create policy verification_selfie_owner_insert on storage.objects
for insert to authenticated
with check (bucket_id='verification-selfies' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists verification_selfie_private_select on storage.objects;
create policy verification_selfie_private_select on storage.objects
for select to authenticated
using (bucket_id='verification-selfies' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_trust_admin(auth.uid())));

drop policy if exists verification_selfie_private_delete on storage.objects;
create policy verification_selfie_private_delete on storage.objects
for delete to authenticated
using (bucket_id='verification-selfies' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_trust_admin(auth.uid())));

-- Upload intent creation (no service key required).
create or replace function public.create_profile_photo_upload_intent(
  p_mime_type text,p_size_bytes bigint,p_position smallint,p_is_primary boolean
) returns table(intent_id uuid,storage_path text,expires_at timestamptz)
language plpgsql security definer set search_path=public,storage as $$
declare v_user uuid:=auth.uid(); v_id uuid:=gen_random_uuid(); v_ext text; v_path text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_user and p.status in ('onboarding','active')) then raise exception 'profile_unavailable'; end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp') or p_size_bytes<1 or p_size_bytes>8388608 then raise exception 'invalid_media'; end if;
  if p_position<0 or p_position>8 then raise exception 'invalid_position'; end if;
  v_ext:=case p_mime_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else 'webp' end;
  v_path:=v_user::text||'/raw-'||gen_random_uuid()::text||'.'||v_ext;
  insert into public.media_upload_intents(id,user_id,bucket,storage_path,kind,mime_type,size_bytes,metadata)
  values(v_id,v_user,'profile-photos',v_path,'profile_photo',p_mime_type,p_size_bytes,jsonb_build_object('position',p_position,'is_primary',p_is_primary));
  return query select v_id,v_path,(select m.expires_at from public.media_upload_intents m where m.id=v_id);
end; $$;
revoke all on function public.create_profile_photo_upload_intent(text,bigint,smallint,boolean) from public;
grant execute on function public.create_profile_photo_upload_intent(text,bigint,smallint,boolean) to authenticated;

create or replace function public.start_verification_challenge(p_challenge text)
returns table(session_id uuid,challenge text,expires_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_id uuid:=gen_random_uuid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_user and p.status in ('onboarding','active') and not p.verification_badge) then raise exception 'profile_unavailable'; end if;
  update public.verification_sessions set status='expired',completed_at=now(),reason_code='superseded',metadata=metadata||jsonb_build_object('stage','expired') where user_id=v_user and status='pending';
  update public.media_upload_intents set status='cancelled',consumed_at=now() where user_id=v_user and kind='verification_selfie' and status='created';
  insert into public.verification_sessions(id,user_id,provider,status,metadata)
  values(v_id,v_user,'manual_selfie','pending',jsonb_build_object('challenge',p_challenge,'stage','challenge_issued','expires_in_minutes',15));
  return query select v_id,p_challenge,now()+interval '15 minutes';
end; $$;
revoke all on function public.start_verification_challenge(text) from public;
grant execute on function public.start_verification_challenge(text) to authenticated;

create or replace function public.create_verification_upload_intent(p_session uuid,p_mime_type text,p_size_bytes bigint)
returns table(intent_id uuid,storage_path text,expires_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_id uuid:=gen_random_uuid(); v_ext text; v_path text; v_challenge text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select metadata->>'challenge' into v_challenge from public.verification_sessions where id=p_session and user_id=v_user and status='pending' and now()-started_at<=interval '15 minutes';
  if v_challenge is null then raise exception 'verification_session_invalid'; end if;
  if p_mime_type not in ('image/jpeg','image/png','image/webp') or p_size_bytes<1 or p_size_bytes>6291456 then raise exception 'invalid_media'; end if;
  v_ext:=case p_mime_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else 'webp' end;
  v_path:=v_user::text||'/raw-'||p_session::text||'-'||gen_random_uuid()::text||'.'||v_ext;
  insert into public.media_upload_intents(id,user_id,bucket,storage_path,kind,mime_type,size_bytes,metadata)
  values(v_id,v_user,'verification-selfies',v_path,'verification_selfie',p_mime_type,p_size_bytes,jsonb_build_object('verification_session_id',p_session,'challenge',v_challenge));
  return query select v_id,v_path,(select m.expires_at from public.media_upload_intents m where m.id=v_id);
end; $$;
revoke all on function public.create_verification_upload_intent(uuid,text,bigint) from public;
grant execute on function public.create_verification_upload_intent(uuid,text,bigint) to authenticated;

-- Make finalizers safe for authenticated callers.
create or replace function public.finalize_profile_photo_upload(p_user uuid,p_intent uuid,p_final_path text,p_status public.photo_status)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_intent public.media_upload_intents%rowtype; v_photo uuid; v_pos smallint; v_primary boolean;
begin
  if auth.uid() is null or p_user<>auth.uid() then raise exception 'not_authorized'; end if;
  if p_status not in ('pending','approved') then raise exception 'invalid_status'; end if;
  if p_status='approved' and current_setting('app.environment',true) is distinct from 'development' then p_status:='pending'; end if;
  select * into v_intent from public.media_upload_intents where id=p_intent and user_id=p_user and kind='profile_photo' and status='created' and expires_at>now() for update;
  if not found then raise exception 'upload_intent_invalid'; end if;
  if p_final_path not like p_user::text||'/%' then raise exception 'invalid_path'; end if;
  v_pos:=coalesce((v_intent.metadata->>'position')::smallint,0); v_primary:=coalesce((v_intent.metadata->>'is_primary')::boolean,false);
  update public.profile_photos set status='removed',is_primary=false where user_id=p_user and position=v_pos and status<>'removed';
  if v_primary then update public.profile_photos set is_primary=false where user_id=p_user; end if;
  insert into public.profile_photos(user_id,storage_path,position,is_primary,status) values(p_user,p_final_path,v_pos,v_primary,'pending') returning id into v_photo;
  update public.media_upload_intents set status='consumed',consumed_at=now(),metadata=metadata||jsonb_build_object('sanitized_path',p_final_path) where id=p_intent;
  perform public.refresh_profile_activation_for(p_user); return v_photo;
end; $$;
revoke all on function public.finalize_profile_photo_upload(uuid,uuid,text,public.photo_status) from public;
grant execute on function public.finalize_profile_photo_upload(uuid,uuid,text,public.photo_status) to authenticated;

create or replace function public.finalize_verification_submission(p_user uuid,p_intent uuid,p_session uuid,p_final_path text,p_auto_verified boolean default false)
returns text language plpgsql security definer set search_path=public as $$
declare v_intent public.media_upload_intents%rowtype; v_session public.verification_sessions%rowtype;
begin
  if auth.uid() is null or p_user<>auth.uid() then raise exception 'not_authorized'; end if;
  select * into v_intent from public.media_upload_intents where id=p_intent and user_id=p_user and kind='verification_selfie' and status='created' and expires_at>now() for update;
  if not found then raise exception 'verification_intent_invalid'; end if;
  if coalesce(v_intent.metadata->>'verification_session_id','')<>p_session::text then raise exception 'verification_session_mismatch'; end if;
  select * into v_session from public.verification_sessions where id=p_session and user_id=p_user and status='pending' for update;
  if not found or now()-v_session.started_at>interval '15 minutes' then raise exception 'verification_session_invalid'; end if;
  if p_final_path not like p_user::text||'/%' then raise exception 'invalid_path'; end if;
  update public.verification_sessions set status='pending',metadata=metadata||jsonb_build_object('stage','submitted','selfie_path',p_final_path,'submitted_at',now()) where id=p_session;
  update public.media_upload_intents set status='consumed',consumed_at=now(),metadata=metadata||jsonb_build_object('sanitized_path',p_final_path) where id=p_intent;
  return 'pending';
end; $$;
revoke all on function public.finalize_verification_submission(uuid,uuid,uuid,text,boolean) from public;
grant execute on function public.finalize_verification_submission(uuid,uuid,uuid,text,boolean) to authenticated;

-- Admin review RPCs.
create or replace function public.review_profile_photo(p_photo uuid,p_decision public.photo_status,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_admin uuid:=auth.uid(); v_photo public.profile_photos%rowtype;
begin
  if not public.is_trust_admin(v_admin) then raise exception 'forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_decision'; end if;
  select * into v_photo from public.profile_photos where id=p_photo and status='pending' for update;
  if not found then raise exception 'not_found'; end if;
  update public.profile_photos set status=p_decision where id=p_photo;
  perform public.refresh_profile_activation_for(v_photo.user_id);
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(v_admin,'profile_photo_'||p_decision::text,'profile_photo',p_photo::text,p_reason,jsonb_build_object('status',v_photo.status),jsonb_build_object('status',p_decision));
  return jsonb_build_object('ok',true,'user_id',v_photo.user_id);
end; $$;
revoke all on function public.review_profile_photo(uuid,public.photo_status,text) from public;
grant execute on function public.review_profile_photo(uuid,public.photo_status,text) to authenticated;

create or replace function public.review_verification_session(p_session uuid,p_decision text,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_admin uuid:=auth.uid(); v_session public.verification_sessions%rowtype; v_path text;
begin
  if not public.is_trust_admin(v_admin) then raise exception 'forbidden'; end if;
  if p_decision not in ('verified','rejected') or length(trim(coalesce(p_reason,'')))<2 then raise exception 'invalid_decision'; end if;
  select * into v_session from public.verification_sessions where id=p_session and status='pending' for update;
  if not found then raise exception 'not_found'; end if;
  if not exists(select 1 from public.profile_photos pp where pp.user_id=v_session.user_id and pp.status='approved') then raise exception 'approved_profile_photo_required'; end if;
  v_path:=v_session.metadata->>'selfie_path';
  if v_path is null then raise exception 'selfie_required'; end if;
  update public.verification_sessions set status=p_decision,completed_at=now(),confidence=case when p_decision='verified' then 1 else null end,reason_code=p_reason,metadata=metadata||jsonb_build_object('stage','completed','reviewed_at',now()) where id=p_session;
  update public.profiles set verification_badge=(p_decision='verified') where id=v_session.user_id;
  perform public.refresh_profile_activation_for(v_session.user_id);
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,after_summary)
  values(v_admin,'verification_'||p_decision,'verification_session',p_session::text,p_reason,jsonb_build_object('status',p_decision));
  return jsonb_build_object('ok',true,'user_id',v_session.user_id,'selfie_path',v_path);
end; $$;
revoke all on function public.review_verification_session(uuid,text,text) from public;
grant execute on function public.review_verification_session(uuid,text,text) to authenticated;

-- Message write is DB-enforced; JS/AI can only make it stricter, never looser.
create or replace function public.submit_message(p_conversation uuid,p_client_message_id text,p_text text,p_provider_action text default 'allow',p_labels jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user uuid := auth.uid();
  v_status_text text := 'sent';
  v_action_text text := 'allow';
  v_id uuid;
  v_event uuid;
  v_created timestamptz;
  v_lower text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not public.can_send_message(p_conversation) then raise exception 'conversation_unavailable'; end if;
  if length(trim(p_text)) < 1 or length(p_text) > 2000 or length(p_client_message_id) < 6 or length(p_client_message_id) > 100 then raise exception 'invalid_message'; end if;
  v_lower := lower(p_text);
  if p_provider_action = 'block' then raise exception 'message_blocked'; end if;
  if p_provider_action = 'hold' or v_lower ~ '(pago por|escort|prostitu|sugar daddy|sugar baby|menor de edad|inversi[oó]n cripto|telegram.{0,20}(pago|sexo)|whatsapp.{0,20}(pago|sexo))' then
    v_status_text := 'held';
    v_action_text := 'hold';
  end if;
  insert into public.moderation_events(user_id,surface,object_type,object_id,provider,policy_version,labels,action,reasons,human_review)
  values(v_user,'message','draft_message',p_client_message_id,'server_pipeline','2026-08-v1',coalesce(p_labels,'{}'::jsonb),v_action_text::public.moderation_action,array[]::text[],(v_status_text='held'))
  returning id into v_event;
  insert into public.messages(conversation_id,sender_id,type,body,status,client_message_id,moderation_event_id)
  values(p_conversation,v_user,'text',trim(p_text),v_status_text::public.message_status,p_client_message_id,v_event)
  on conflict(sender_id,client_message_id) do update set sender_id=excluded.sender_id
  returning id,created_at into v_id,v_created;
  if v_status_text='sent' then update public.conversations set last_message_at=now() where id=p_conversation; end if;
  return jsonb_build_object('id',v_id,'conversation_id',p_conversation,'status',v_status_text,'created_at',v_created);
end; $$;
revoke all on function public.submit_message(uuid,text,text,text,jsonb) from public;
grant execute on function public.submit_message(uuid,text,text,text,jsonb) to authenticated;
