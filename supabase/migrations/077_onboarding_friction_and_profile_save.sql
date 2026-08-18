-- V14: reduce onboarding friction without weakening adult/legal/trust gates.

alter table public.user_location_private
  add column if not exists address_label text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname='user_location_private_address_label_length'
  ) then
    alter table public.user_location_private
      add constraint user_location_private_address_label_length
      check (address_label is null or char_length(address_label) <= 160);
  end if;
end $$;

create or replace function public.refresh_profile_activation_for(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_profile public.profiles%rowtype;
  v_pref public.dating_preferences%rowtype;
  v_birth date;
  v_photos int:=0;
  v_interests int:=0;
  v_completion int:=20;
  v_active boolean:=false;
  v_terms boolean:=false;
  v_privacy boolean:=false;
  v_sensitive boolean:=false;
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

  if char_length(trim(v_profile.display_name)) between 1 and 40 then v_completion:=v_completion+20; end if;
  if char_length(trim(coalesce(v_profile.bio,'')))>0 then v_completion:=v_completion+10; end if;
  if coalesce(nullif(trim(v_profile.gender_identity),''),'unspecified')<>'unspecified' then v_completion:=v_completion+5; end if;
  if coalesce(trim(v_profile.district),'')<>'' then v_completion:=v_completion+5; end if;
  if cardinality(coalesce(v_pref.interested_in,'{}'::text[]))>0 then v_completion:=v_completion+10; end if;
  if v_interests>=1 then v_completion:=v_completion+5; end if;
  if v_interests>=3 then v_completion:=v_completion+5; end if;
  if v_photos>=1 then v_completion:=v_completion+5; end if;
  if v_photos>=2 then v_completion:=v_completion+5; end if;
  if v_profile.verification_badge then v_completion:=v_completion+10; end if;

  -- Optional profile enrichment never blocks activation. Adult/legal/trust gates still do.
  v_active:=public.is_adult(v_birth)
    and char_length(trim(v_profile.display_name)) between 1 and 40
    and v_photos>=2
    and v_profile.verification_badge
    and v_terms and v_privacy and v_sensitive
    and not exists(select 1 from public.sanctions s where s.user_id=p_user and s.active and s.type in ('discover_hidden','suspension','ban'));

  update public.profiles
  set profile_completion=least(100,v_completion),
      status=case when status in ('restricted','suspended','banned','deletion_requested','deleted') then status when v_active then 'active'::public.account_status else 'onboarding'::public.account_status end,
      last_active_at=now()
  where id=p_user;

  return jsonb_build_object('active',v_active,'completion',least(100,v_completion),'approved_photos',v_photos,'interests',v_interests,'verified',v_profile.verification_badge);
end;
$$;

create or replace function public.save_onboarding_profile_v14(
  p_display_name text,
  p_bio text,
  p_gender_identity text,
  p_city text,
  p_district text,
  p_intent public.relationship_intent,
  p_interested_in text[],
  p_min_age smallint,
  p_max_age smallint,
  p_max_distance_km smallint,
  p_intentions public.relationship_intent[],
  p_interest_ids bigint[],
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_m integer default null,
  p_address_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid:=auth.uid();
  v_count int:=0;
  v_interest_ids bigint[]:=coalesce(p_interest_ids,'{}'::bigint[]);
  v_interested_in text[]:=coalesce(p_interested_in,'{}'::text[]);
  v_intentions public.relationship_intent[]:=coalesce(p_intentions,'{}'::public.relationship_intent[]);
  v_gender text:=coalesce(nullif(trim(p_gender_identity),''),'unspecified');
  v_result jsonb;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.user_private where user_id=v_user and public.is_adult(birth_date)) then raise exception 'adult_only'; end if;
  if char_length(trim(coalesce(p_display_name,''))) not between 1 and 40 then raise exception 'invalid_display_name'; end if;
  if char_length(trim(coalesce(p_bio,'')))>500 then raise exception 'invalid_bio'; end if;
  if char_length(v_gender)>80 then raise exception 'invalid_gender'; end if;
  if char_length(trim(coalesce(p_district,'')))>80 then raise exception 'invalid_district'; end if;
  if char_length(trim(coalesce(p_address_label,'')))>160 then raise exception 'invalid_address'; end if;
  if cardinality(v_interested_in)>10 then raise exception 'invalid_preferences'; end if;
  if p_min_age<18 or p_max_age>99 or p_max_age<p_min_age then raise exception 'invalid_age_range'; end if;
  if p_max_distance_km<1 or p_max_distance_km>250 then raise exception 'invalid_distance'; end if;
  if cardinality(v_interest_ids)>8 then raise exception 'interest_count_invalid'; end if;

  if cardinality(v_interest_ids)>0 then
    select count(*) into v_count from public.interests where id=any(v_interest_ids) and active;
    if v_count<>cardinality(v_interest_ids) then raise exception 'invalid_interest'; end if;
  end if;

  insert into public.profiles(id,display_name,bio,gender_identity,city,district,country_code,intent,verification_badge,profile_completion,status,last_active_at)
  values(v_user,trim(p_display_name),trim(coalesce(p_bio,'')),v_gender,coalesce(nullif(trim(p_city),''),'Lima'),nullif(trim(p_district),''),'PE',p_intent,false,20,'onboarding',now())
  on conflict(id) do update set
    display_name=excluded.display_name,
    bio=excluded.bio,
    gender_identity=excluded.gender_identity,
    city=excluded.city,
    district=excluded.district,
    intent=excluded.intent,
    last_active_at=now();

  insert into public.dating_preferences(user_id,interested_in,min_age,max_age,max_distance_km,intentions)
  values(v_user,v_interested_in,p_min_age,p_max_age,p_max_distance_km,v_intentions)
  on conflict(user_id) do update set
    interested_in=excluded.interested_in,
    min_age=excluded.min_age,
    max_age=excluded.max_age,
    max_distance_km=excluded.max_distance_km,
    intentions=excluded.intentions,
    updated_at=now();

  delete from public.profile_interests where user_id=v_user;
  if cardinality(v_interest_ids)>0 then
    insert into public.profile_interests(user_id,interest_id) select v_user,unnest(v_interest_ids);
  end if;

  if (p_latitude is null) <> (p_longitude is null) then raise exception 'invalid_coordinates'; end if;
  if p_latitude is not null and p_longitude is not null then
    if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'invalid_coordinates'; end if;
    insert into public.user_location_private(user_id,latitude,longitude,accuracy_m,source,district,city,address_label)
    values(v_user,p_latitude,p_longitude,p_accuracy_m,'gps',nullif(trim(p_district),''),coalesce(nullif(trim(p_city),''),'Lima'),nullif(trim(p_address_label),''))
    on conflict(user_id) do update set
      latitude=excluded.latitude,
      longitude=excluded.longitude,
      accuracy_m=excluded.accuracy_m,
      source='gps',
      district=excluded.district,
      city=excluded.city,
      address_label=excluded.address_label,
      updated_at=now();
  elsif exists(select 1 from public.user_location_private where user_id=v_user) then
    update public.user_location_private
    set district=nullif(trim(p_district),''),
        city=coalesce(nullif(trim(p_city),''),'Lima'),
        address_label=nullif(trim(p_address_label),''),
        updated_at=now()
    where user_id=v_user;
  elsif coalesce(trim(p_address_label),'')<>'' then
    insert into public.user_location_private(user_id,source,district,city,address_label)
    values(v_user,'manual',nullif(trim(p_district),''),coalesce(nullif(trim(p_city),''),'Lima'),trim(p_address_label));
  end if;

  v_result:=public.refresh_profile_activation_for(v_user);
  return jsonb_build_object('saved',true,'activation',v_result);
end;
$$;

revoke all on function public.save_onboarding_profile_v14(text,text,text,text,text,public.relationship_intent,text[],smallint,smallint,smallint,public.relationship_intent[],bigint[],double precision,double precision,integer,text) from public,anon;
grant execute on function public.save_onboarding_profile_v14(text,text,text,text,text,public.relationship_intent,text[],smallint,smallint,smallint,public.relationship_intent[],bigint[],double precision,double precision,integer,text) to authenticated;
