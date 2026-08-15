-- CitaFuego V1.0 / 005_discovery_rpc.sql
-- Bounded discovery query: raw coordinates and exact DOB never leave the database.

create or replace function public.get_discover_candidates(p_limit integer default 20)
returns table (
  profile_id uuid,
  display_name text,
  age integer,
  district text,
  distance_bucket text,
  bio text,
  intent public.relationship_intent,
  verified boolean,
  primary_photo_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  return query
  with me as (
    select
      p.id,
      p.gender_identity,
      pref.min_age,
      pref.max_age,
      pref.max_distance_km,
      pref.interested_in,
      pref.intentions,
      pref.verified_only,
      loc.latitude as my_lat,
      loc.longitude as my_lon
    from public.profiles p
    join public.dating_preferences pref on pref.user_id = p.id
    left join public.user_location_private loc on loc.user_id = p.id
    where p.id = v_user
  ),
  candidates as (
    select
      p.id,
      p.display_name,
      extract(year from age(current_date, priv.birth_date))::integer as age,
      p.district,
      p.bio,
      p.intent,
      p.verification_badge,
      pref.interested_in as target_interested_in,
      me.gender_identity as my_gender,
      me.min_age,
      me.max_age,
      me.max_distance_km,
      me.interested_in,
      me.intentions,
      me.verified_only,
      case
        when me.my_lat is null or me.my_lon is null or loc.latitude is null or loc.longitude is null then null
        else 6371 * acos(
          least(1.0, greatest(-1.0,
            cos(radians(me.my_lat)) * cos(radians(loc.latitude)) * cos(radians(loc.longitude) - radians(me.my_lon))
            + sin(radians(me.my_lat)) * sin(radians(loc.latitude))
          ))
        )
      end as distance_km,
      photo.storage_path as primary_photo_path,
      p.last_active_at,
      p.profile_completion
    from public.profiles p
    join public.user_private priv on priv.user_id = p.id
    join public.dating_preferences pref on pref.user_id = p.id
    left join public.user_location_private loc on loc.user_id = p.id
    left join lateral (
      select pp.storage_path
      from public.profile_photos pp
      where pp.user_id = p.id and pp.status = 'approved'
      order by pp.is_primary desc, pp.position asc
      limit 1
    ) photo on true
    cross join me
    where p.id <> v_user
      and p.status = 'active'
      and photo.storage_path is not null
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = v_user and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = v_user)
      )
      and not exists (
        select 1 from public.interactions i
        where i.from_user_id = v_user and i.to_user_id = p.id
      )
  )
  select
    c.id,
    c.display_name,
    c.age,
    c.district,
    case
      when c.distance_km is null then 'Zona aproximada'
      when c.distance_km < 1 then '<1 km'
      when c.distance_km < 3 then '1–3 km'
      when c.distance_km < 10 then '3–10 km'
      when c.distance_km < 30 then '10–30 km'
      else '30+ km'
    end,
    c.bio,
    c.intent,
    c.verification_badge,
    c.primary_photo_path
  from candidates c
  where c.age between c.min_age and c.max_age
    and (cardinality(c.interested_in) = 0 or c.target_interested_in && array[c.my_gender])
    and (cardinality(c.intentions) = 0 or c.intent = any(c.intentions))
    and (not c.verified_only or c.verification_badge)
    and (c.distance_km is null or c.distance_km <= c.max_distance_km)
  order by
    c.verification_badge desc,
    c.profile_completion desc,
    c.last_active_at desc nulls last
  limit least(greatest(p_limit, 1), 50);
end;
$$;

revoke all on function public.get_discover_candidates(integer) from public;
grant execute on function public.get_discover_candidates(integer) to authenticated;
