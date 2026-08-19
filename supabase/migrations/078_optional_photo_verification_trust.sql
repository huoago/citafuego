-- V19: photos and selfie verification are optional trust signals, not access gates.
-- Adult age, visible name, current legal consents, blocks/sanctions and all existing safety controls remain enforced.

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
  v_sanctioned boolean:=false;
  v_trust_level text:='standard';
begin
  select * into v_profile from public.profiles where id=p_user;
  if not found then return jsonb_build_object('active',false,'completion',0,'reason','profile_missing','trust_level','standard'); end if;

  select * into v_pref from public.dating_preferences where user_id=p_user;
  select birth_date into v_birth from public.user_private where user_id=p_user;
  select count(*) into v_photos from public.profile_photos where user_id=p_user and status='approved';
  select count(*) into v_interests from public.profile_interests where user_id=p_user;

  select exists(
    select 1 from public.consent_events c
    join public.legal_document_versions l on l.document_type=c.consent_type
    where c.user_id=p_user and c.consent_type='terms' and c.granted and c.document_version=l.current_version
  ) into v_terms;
  select exists(
    select 1 from public.consent_events c
    join public.legal_document_versions l on l.document_type=c.consent_type
    where c.user_id=p_user and c.consent_type='privacy' and c.granted and c.document_version=l.current_version
  ) into v_privacy;
  select exists(
    select 1 from public.consent_events c
    join public.legal_document_versions l on l.document_type=c.consent_type
    where c.user_id=p_user and c.consent_type='sensitive_data' and c.granted and c.document_version=l.current_version
  ) into v_sensitive;
  select exists(
    select 1 from public.sanctions s
    where s.user_id=p_user and s.active and s.type in ('discover_hidden','suspension','ban')
  ) into v_sanctioned;

  if char_length(trim(coalesce(v_profile.display_name,''))) between 1 and 40 then v_completion:=v_completion+20; end if;
  if char_length(trim(coalesce(v_profile.bio,'')))>0 then v_completion:=v_completion+10; end if;
  if coalesce(nullif(trim(v_profile.gender_identity),''),'unspecified')<>'unspecified' then v_completion:=v_completion+5; end if;
  if coalesce(trim(v_profile.district),'')<>'' then v_completion:=v_completion+5; end if;
  if cardinality(coalesce(v_pref.interested_in,'{}'::text[]))>0 then v_completion:=v_completion+10; end if;
  if v_interests>=1 then v_completion:=v_completion+5; end if;
  if v_interests>=3 then v_completion:=v_completion+5; end if;
  if v_photos>=1 then v_completion:=v_completion+5; end if;
  if v_photos>=2 then v_completion:=v_completion+5; end if;
  if v_profile.verification_badge then v_completion:=v_completion+10; end if;

  if v_photos>0 and v_profile.verification_badge then v_trust_level:='advanced';
  elsif v_profile.verification_badge then v_trust_level:='verified';
  elsif v_photos>0 then v_trust_level:='photos';
  else v_trust_level:='standard';
  end if;

  -- Required access gates: adult + visible name + current legal consent + no active safety sanction.
  -- Photos and selfie verification intentionally DO NOT block activation.
  v_active:=public.is_adult(v_birth)
    and char_length(trim(coalesce(v_profile.display_name,''))) between 1 and 40
    and v_terms and v_privacy and v_sensitive
    and not v_sanctioned;

  update public.profiles
  set profile_completion=least(100,v_completion),
      status=case
        when status in ('restricted','suspended','banned','deletion_requested','deleted') then status
        when v_active then 'active'::public.account_status
        else 'onboarding'::public.account_status
      end,
      last_active_at=now()
  where id=p_user;

  return jsonb_build_object(
    'active',v_active,
    'completion',least(100,v_completion),
    'approved_photos',v_photos,
    'has_photo',v_photos>0,
    'interests',v_interests,
    'verified',v_profile.verification_badge,
    'trust_level',v_trust_level,
    'required_ready',public.is_adult(v_birth) and char_length(trim(coalesce(v_profile.display_name,''))) between 1 and 40 and v_terms and v_privacy and v_sensitive,
    'safety_restricted',v_sanctioned
  );
end;
$$;

revoke all on function public.refresh_profile_activation_for(uuid) from public,anon,authenticated;
grant execute on function public.refresh_profile_activation_for(uuid) to service_role;

-- Keep the existing discovery contract, but no longer require an approved photo.
-- No-photo profiles receive a neutral UI placeholder in the application serializer.
create or replace function public.get_discover_candidates(p_limit integer default 20)
returns table(
  profile_id uuid,
  display_name text,
  age integer,
  district text,
  distance_bucket text,
  bio text,
  intent public.relationship_intent,
  verified boolean,
  primary_photo_path text,
  interests text[],
  shared_interest_count integer,
  chemistry_score integer
)
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.profiles where id=v_user and status='active') then raise exception 'profile_not_active'; end if;

  return query
  with me as (
    select p.id,p.gender_identity,p.intent my_intent,p.verification_badge my_verified,p.city my_city,p.country_code my_country_code,
      extract(year from age(current_date,priv.birth_date))::int my_age,
      pref.min_age,pref.max_age,pref.max_distance_km,pref.interested_in,pref.intentions,pref.verified_only,
      loc.latitude my_lat,loc.longitude my_lon,
      array(select pi.interest_id from public.profile_interests pi where pi.user_id=p.id) my_interest_ids
    from public.profiles p
    join public.user_private priv on priv.user_id=p.id
    join public.dating_preferences pref on pref.user_id=p.id
    left join public.user_location_private loc on loc.user_id=p.id
    where p.id=v_user
  ), c as (
    select p.id,p.display_name,
      extract(year from age(current_date,priv.birth_date))::int candidate_age,
      p.district,p.bio,p.intent,p.verification_badge,p.last_active_at,p.profile_completion,
      cpref.interested_in candidate_interested_in,cpref.intentions candidate_intentions,
      cpref.verified_only candidate_verified_only,cpref.max_distance_km candidate_max_distance_km,
      me.gender_identity my_gender,me.my_intent,me.my_verified,me.my_age,me.min_age,me.max_age,me.max_distance_km,me.intentions,me.verified_only,
      case when me.my_lat is null or me.my_lon is null or loc.latitude is null or loc.longitude is null then null
        else 6371*acos(least(1.0,greatest(-1.0,cos(radians(me.my_lat))*cos(radians(loc.latitude))*cos(radians(loc.longitude)-radians(me.my_lon))+sin(radians(me.my_lat))*sin(radians(loc.latitude))))) end distance_km,
      photo.storage_path primary_photo_path,
      coalesce(ints.labels,'{}'::text[]) interest_labels,
      coalesce(ints.shared_count,0)::int shared_count
    from public.profiles p
    join public.user_private priv on priv.user_id=p.id
    join public.dating_preferences cpref on cpref.user_id=p.id
    left join public.user_location_private loc on loc.user_id=p.id
    left join lateral(
      select pp.storage_path from public.profile_photos pp
      where pp.user_id=p.id and pp.status='approved'
      order by pp.is_primary desc,pp.position asc,pp.created_at asc limit 1
    ) photo on true
    left join lateral(
      select array_agg(i.label_es order by i.label_es) labels,
        count(*) filter(where pi.interest_id=any(me.my_interest_ids)) shared_count
      from public.profile_interests pi
      join public.interests i on i.id=pi.interest_id and i.active
      where pi.user_id=p.id
    ) ints on true
    cross join me
    where p.id<>v_user
      and p.status='active'
      and p.city=me.my_city
      and p.country_code=me.my_country_code
      and (cardinality(me.interested_in)=0 or p.gender_identity=any(me.interested_in))
      and (cardinality(cpref.interested_in)=0 or me.gender_identity=any(cpref.interested_in))
      and me.my_age between cpref.min_age and cpref.max_age
      and (cardinality(cpref.intentions)=0 or me.my_intent=any(cpref.intentions))
      and (not cpref.verified_only or me.my_verified)
      and not exists(select 1 from public.blocks b where (b.blocker_id=v_user and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=v_user))
      and not exists(select 1 from public.interactions i where i.from_user_id=v_user and i.to_user_id=p.id)
  )
  select c.id,c.display_name,c.candidate_age,c.district,
    case when c.distance_km is null then 'Zona aproximada' when c.distance_km<1 then '<1 km' when c.distance_km<3 then '1–3 km' when c.distance_km<10 then '3–10 km' when c.distance_km<30 then '10–30 km' else '30+ km' end,
    c.bio,c.intent,c.verification_badge,c.primary_photo_path,c.interest_labels,c.shared_count,
    least(99,greatest(40,50
      +case when c.verification_badge then 8 else 0 end
      +least(c.shared_count*4,20)
      +case when c.distance_km is null then 0 when c.distance_km<3 then 10 when c.distance_km<10 then 6 else 2 end
      +case when c.intent=any(c.intentions) then 8 else 0 end
      +least(c.profile_completion/10,10)))::int
  from c
  where c.candidate_age between c.min_age and c.max_age
    and (cardinality(c.intentions)=0 or c.intent=any(c.intentions))
    and (not c.verified_only or c.verification_badge)
    and (c.distance_km is null or c.distance_km<=least(c.max_distance_km,c.candidate_max_distance_km))
  order by 12 desc,c.verification_badge desc,c.last_active_at desc nulls last
  limit least(greatest(coalesce(p_limit,20),1),50);
end;
$$;

-- Re-evaluate only onboarding accounts. Restricted/suspended/banned states are never promoted here.
do $$
declare r record;
begin
  for r in select id from public.profiles where status='onboarding' loop
    perform public.refresh_profile_activation_for(r.id);
  end loop;
end $$;
