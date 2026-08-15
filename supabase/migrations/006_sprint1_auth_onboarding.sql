-- Sprint 1: adult gate, legal consent, onboarding, private media intents and activation.

create table public.legal_document_versions (
  document_type text primary key check (document_type in ('terms','privacy','sensitive_data')),
  current_version text not null,
  effective_at timestamptz not null default now()
);

insert into public.legal_document_versions(document_type,current_version) values
('terms','2026-08-15-v1'),('privacy','2026-08-15-v1'),('sensitive_data','2026-08-15-v1')
on conflict (document_type) do nothing;

create table public.media_upload_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (bucket in ('profile-photos','verification-selfies')),
  storage_path text not null unique,
  kind text not null check (kind in ('profile_photo','verification_selfie')),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 8388608),
  status text not null default 'created' check (status in ('created','consumed','expired','cancelled')),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);
create index media_upload_intents_user_status_idx on public.media_upload_intents(user_id,status,created_at desc);
alter table public.media_upload_intents enable row level security;
create policy media_upload_intents_self_read on public.media_upload_intents for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.media_upload_intents from authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values
('profile-photos','profile-photos',false,8388608,array['image/jpeg','image/png','image/webp']),
('verification-selfies','verification-selfies',false,6291456,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.is_adult(p_birth_date date)
returns boolean language sql stable as $$
  select p_birth_date is not null and p_birth_date <= (current_date - interval '18 years')::date and p_birth_date >= date '1900-01-01';
$$;

create or replace function public.handle_citafuego_new_user()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare
  v_birth date;
  v_terms text;
  v_privacy text;
  v_sensitive text;
begin
  begin v_birth := (new.raw_user_meta_data->>'birth_date')::date; exception when others then raise exception 'invalid_birth_date'; end;
  if not public.is_adult(v_birth) then raise exception 'adult_only'; end if;
  v_terms := nullif(new.raw_user_meta_data->>'terms_version','');
  v_privacy := nullif(new.raw_user_meta_data->>'privacy_version','');
  v_sensitive := nullif(new.raw_user_meta_data->>'sensitive_data_version','');
  if v_terms is null or v_privacy is null or v_sensitive is null then raise exception 'legal_consent_required'; end if;
  if v_terms <> (select current_version from public.legal_document_versions where document_type='terms')
     or v_privacy <> (select current_version from public.legal_document_versions where document_type='privacy')
     or v_sensitive <> (select current_version from public.legal_document_versions where document_type='sensitive_data') then
    raise exception 'legal_consent_version_invalid';
  end if;
  insert into public.user_private(user_id,birth_date) values(new.id,v_birth) on conflict(user_id) do nothing;
  insert into public.dating_preferences(user_id) values(new.id) on conflict(user_id) do nothing;
  insert into public.consent_events(user_id,consent_type,document_version,granted,source) values
    (new.id,'terms',v_terms,true,'web_signup'),(new.id,'privacy',v_privacy,true,'web_signup'),(new.id,'sensitive_data',v_sensitive,true,'web_signup');
  return new;
end; $$;

drop trigger if exists on_auth_user_created_citafuego on auth.users;
create trigger on_auth_user_created_citafuego after insert on auth.users for each row execute function public.handle_citafuego_new_user();

create or replace function public.refresh_profile_activation_for(p_user uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_profile public.profiles%rowtype;
  v_pref public.dating_preferences%rowtype;
  v_birth date;
  v_photos int:=0; v_interests int:=0; v_completion int:=0; v_active boolean:=false;
  v_terms boolean:=false; v_privacy boolean:=false; v_sensitive boolean:=false;
begin
  select * into v_profile from public.profiles where id=p_user;
  if not found then return jsonb_build_object('active',false,'completion',0,'reason','profile_missing'); end if;
  select * into v_pref from public.dating_preferences where user_id=p_user;
  select birth_date into v_birth from public.user_private where user_id=p_user;
  select count(*) into v_photos from public.profile_photos where user_id=p_user and status='approved';
  select count(*) into v_interests from public.profile_interests where user_id=p_user;
  select exists(select 1 from public.consent_events c join public.legal_document_versions l on l.document_type=c.consent_type where c.user_id=p_user and c.consent_type='terms' and c.granted and c.document_version=l.current_version) into v_terms;
  select exists(select 1 from public.consent_events c join public.legal_document_versions l on l.document_type=c.consent_type where c.user_id=p_user and c.consent_type='privacy' and c.granted and c.document_version=l.current_version) into v_privacy;
  select exists(select 1 from public.consent_events c join public.legal_document_versions l on l.document_type=c.consent_type where c.user_id=p_user and c.consent_type='sensitive_data' and c.granted and c.document_version=l.current_version) into v_sensitive;
  v_completion := 35;
  if char_length(trim(v_profile.bio))>=20 then v_completion:=v_completion+15; end if;
  if cardinality(v_pref.interested_in)>0 then v_completion:=v_completion+10; end if;
  if v_interests>=3 then v_completion:=v_completion+15; end if;
  if v_photos>=1 then v_completion:=v_completion+10; end if;
  if v_photos>=2 then v_completion:=v_completion+10; end if;
  if v_profile.verification_badge then v_completion:=least(100,v_completion+5); end if;
  v_active := public.is_adult(v_birth) and char_length(trim(v_profile.bio))>=20 and cardinality(v_pref.interested_in)>0 and v_interests>=3 and v_photos>=2 and v_profile.verification_badge and v_terms and v_privacy and v_sensitive
    and not exists(select 1 from public.sanctions s where s.user_id=p_user and s.active and s.type in ('discover_hidden','suspension','ban'));
  update public.profiles set profile_completion=least(100,v_completion), status=case when status in ('restricted','suspended','banned','deletion_requested','deleted') then status when v_active then 'active'::public.account_status else 'onboarding'::public.account_status end, last_active_at=now() where id=p_user;
  return jsonb_build_object('active',v_active,'completion',least(100,v_completion),'approved_photos',v_photos,'interests',v_interests,'verified',v_profile.verification_badge);
end; $$;
revoke all on function public.refresh_profile_activation_for(uuid) from public, authenticated;

create or replace function public.refresh_profile_activation()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return public.refresh_profile_activation_for(auth.uid());
end; $$;
revoke all on function public.refresh_profile_activation() from public;
grant execute on function public.refresh_profile_activation() to authenticated;

create or replace function public.save_onboarding_profile(
  p_display_name text,p_bio text,p_gender_identity text,p_city text,p_district text,p_intent public.relationship_intent,
  p_interested_in text[],p_min_age smallint,p_max_age smallint,p_max_distance_km smallint,p_intentions public.relationship_intent[],p_interest_ids bigint[],
  p_latitude double precision default null,p_longitude double precision default null,p_accuracy_m integer default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_count int; v_result jsonb;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.user_private where user_id=v_user and public.is_adult(birth_date)) then raise exception 'adult_only'; end if;
  if char_length(trim(p_display_name)) not between 1 and 40 then raise exception 'invalid_display_name'; end if;
  if char_length(trim(p_bio)) not between 20 and 500 then raise exception 'invalid_bio'; end if;
  if p_gender_identity is null or trim(p_gender_identity)='' then raise exception 'invalid_gender'; end if;
  if cardinality(coalesce(p_interested_in,'{}'::text[]))<1 then raise exception 'preferences_required'; end if;
  if p_min_age<18 or p_max_age>99 or p_max_age<p_min_age then raise exception 'invalid_age_range'; end if;
  if p_max_distance_km<1 or p_max_distance_km>250 then raise exception 'invalid_distance'; end if;
  if cardinality(coalesce(p_interest_ids,'{}'::bigint[]))<3 or cardinality(p_interest_ids)>8 then raise exception 'interest_count_invalid'; end if;
  select count(*) into v_count from public.interests where id=any(p_interest_ids) and active;
  if v_count<>cardinality(p_interest_ids) then raise exception 'invalid_interest'; end if;
  insert into public.profiles(id,display_name,bio,gender_identity,city,district,country_code,intent,verification_badge,profile_completion,status,last_active_at)
  values(v_user,trim(p_display_name),trim(p_bio),trim(p_gender_identity),coalesce(nullif(trim(p_city),''),'Lima'),nullif(trim(p_district),''),'PE',p_intent,false,60,'onboarding',now())
  on conflict(id) do update set display_name=excluded.display_name,bio=excluded.bio,gender_identity=excluded.gender_identity,city=excluded.city,district=excluded.district,intent=excluded.intent,last_active_at=now();
  insert into public.dating_preferences(user_id,interested_in,min_age,max_age,max_distance_km,intentions)
  values(v_user,p_interested_in,p_min_age,p_max_age,p_max_distance_km,coalesce(p_intentions,'{}'::public.relationship_intent[]))
  on conflict(user_id) do update set interested_in=excluded.interested_in,min_age=excluded.min_age,max_age=excluded.max_age,max_distance_km=excluded.max_distance_km,intentions=excluded.intentions,updated_at=now();
  delete from public.profile_interests where user_id=v_user;
  insert into public.profile_interests(user_id,interest_id) select v_user,unnest(p_interest_ids);
  if p_latitude is not null and p_longitude is not null then
    if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'invalid_coordinates'; end if;
    insert into public.user_location_private(user_id,latitude,longitude,accuracy_m,source,district,city) values(v_user,p_latitude,p_longitude,p_accuracy_m,'gps',nullif(trim(p_district),''),coalesce(nullif(trim(p_city),''),'Lima'))
    on conflict(user_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,accuracy_m=excluded.accuracy_m,source='gps',district=excluded.district,city=excluded.city,updated_at=now();
  end if;
  v_result:=public.refresh_profile_activation_for(v_user);
  return jsonb_build_object('saved',true,'activation',v_result);
end; $$;
revoke all on function public.save_onboarding_profile(text,text,text,text,text,public.relationship_intent,text[],smallint,smallint,smallint,public.relationship_intent[],bigint[],double precision,double precision,integer) from public;
grant execute on function public.save_onboarding_profile(text,text,text,text,text,public.relationship_intent,text[],smallint,smallint,smallint,public.relationship_intent[],bigint[],double precision,double precision,integer) to authenticated;

grant execute on function public.refresh_profile_activation_for(uuid) to service_role;
