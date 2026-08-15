-- Real discovery with reciprocal preferences and no exact DOB/coordinates in output.
drop function if exists public.get_discover_candidates(integer);

create or replace function public.get_discover_candidates(p_limit integer default 20)
returns table(profile_id uuid,display_name text,age integer,district text,distance_bucket text,bio text,intent public.relationship_intent,verified boolean,primary_photo_path text,interests text[],shared_interest_count integer,chemistry_score integer)
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.profiles where id=v_user and status='active') then raise exception 'profile_not_active'; end if;
  return query
  with me as (
    select p.id,p.gender_identity,p.intent my_intent,p.verification_badge my_verified,p.city my_city,p.country_code my_country_code,
      extract(year from age(current_date,priv.birth_date))::int my_age,pref.min_age,pref.max_age,pref.max_distance_km,pref.interested_in,pref.intentions,pref.verified_only,
      loc.latitude my_lat,loc.longitude my_lon,array(select pi.interest_id from public.profile_interests pi where pi.user_id=p.id) my_interest_ids
    from public.profiles p join public.user_private priv on priv.user_id=p.id join public.dating_preferences pref on pref.user_id=p.id left join public.user_location_private loc on loc.user_id=p.id where p.id=v_user
  ), c as (
    select p.id,p.display_name,extract(year from age(current_date,priv.birth_date))::int candidate_age,p.district,p.bio,p.intent,p.verification_badge,p.last_active_at,p.profile_completion,
      cpref.interested_in candidate_interested_in,cpref.intentions candidate_intentions,cpref.verified_only candidate_verified_only,cpref.max_distance_km candidate_max_distance_km,
      me.gender_identity my_gender,me.my_intent,me.my_verified,me.my_age,me.min_age,me.max_age,me.max_distance_km,me.intentions,me.verified_only,
      case when me.my_lat is null or me.my_lon is null or loc.latitude is null or loc.longitude is null then null else 6371*acos(least(1.0,greatest(-1.0,cos(radians(me.my_lat))*cos(radians(loc.latitude))*cos(radians(loc.longitude)-radians(me.my_lon))+sin(radians(me.my_lat))*sin(radians(loc.latitude))))) end distance_km,
      photo.storage_path primary_photo_path,coalesce(ints.labels,'{}'::text[]) interest_labels,coalesce(ints.shared_count,0)::int shared_count
    from public.profiles p join public.user_private priv on priv.user_id=p.id join public.dating_preferences cpref on cpref.user_id=p.id left join public.user_location_private loc on loc.user_id=p.id
    left join lateral(select pp.storage_path from public.profile_photos pp where pp.user_id=p.id and pp.status='approved' order by pp.is_primary desc,pp.position asc,pp.created_at asc limit 1) photo on true
    left join lateral(select array_agg(i.label_es order by i.label_es) labels,count(*) filter(where pi.interest_id=any(me.my_interest_ids)) shared_count from public.profile_interests pi join public.interests i on i.id=pi.interest_id and i.active where pi.user_id=p.id) ints on true
    cross join me
    where p.id<>v_user and p.status='active' and p.city=me.my_city and p.country_code=me.my_country_code and photo.storage_path is not null
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
    least(99,greatest(40,50+case when c.verification_badge then 8 else 0 end+least(c.shared_count*4,20)+case when c.distance_km is null then 0 when c.distance_km<3 then 10 when c.distance_km<10 then 6 else 2 end+case when c.intent=any(c.intentions) then 8 else 0 end+least(c.profile_completion/10,10)))::int
  from c where c.candidate_age between c.min_age and c.max_age and (cardinality(c.intentions)=0 or c.intent=any(c.intentions)) and (not c.verified_only or c.verification_badge) and (c.distance_km is null or c.distance_km<=least(c.max_distance_km,c.candidate_max_distance_km))
  order by 12 desc,c.verification_badge desc,c.last_active_at desc nulls last limit least(greatest(coalesce(p_limit,20),1),50);
end; $$;
revoke all on function public.get_discover_candidates(integer) from public;
grant execute on function public.get_discover_candidates(integer) to authenticated;
