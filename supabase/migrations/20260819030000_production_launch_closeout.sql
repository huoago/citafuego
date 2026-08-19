-- CitaFuego production launch closeout.
-- Applied to production on 2026-08-19 before this migration was committed.

alter table public.admin_user_roles
  add column if not exists expires_at timestamptz,
  add column if not exists grant_reason text;
create index if not exists admin_user_roles_active_idx on public.admin_user_roles(user_id,role_id,expires_at);

drop policy if exists admin_roles_self_read on public.admin_user_roles;
create policy admin_roles_self_read on public.admin_user_roles for select to authenticated using ((select auth.uid())=user_id);

create or replace function public.admin_has_any_role(p_roles text[])
returns boolean language sql stable security definer set search_path='public' as $$
  select (select auth.uid()) is not null and exists(
    select 1 from public.admin_user_roles aur
    where aur.user_id=(select auth.uid()) and aur.role_id=any(p_roles)
      and (aur.expires_at is null or aur.expires_at>now())
  );
$$;

create or replace function public.is_trust_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path='public' as $$
  select p_user is not null and exists(
    select 1 from public.admin_user_roles aur
    where aur.user_id=p_user and aur.role_id in ('super_admin','trust_safety')
      and (aur.expires_at is null or aur.expires_at>now())
  );
$$;

create or replace function public.admin_list_role_assignments()
returns table(user_id uuid,username text,display_name text,role_id text,role_name text,granted_at timestamptz,expires_at timestamptz,grant_reason text,active boolean)
language plpgsql security definer set search_path='public','pg_temp' as $$
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  return query
  select aur.user_id,au.username,p.display_name,aur.role_id,ar.name,aur.granted_at,aur.expires_at,aur.grant_reason,(aur.expires_at is null or aur.expires_at>now())
  from public.admin_user_roles aur join public.admin_roles ar on ar.id=aur.role_id
  left join public.account_usernames au on au.user_id=aur.user_id left join public.profiles p on p.id=aur.user_id
  order by (aur.role_id='super_admin') desc,aur.granted_at desc;
end;$$;

create or replace function public.admin_search_role_candidates(p_query text default '',p_limit integer default 20)
returns table(user_id uuid,username text,display_name text,status public.account_status)
language plpgsql security definer set search_path='public','pg_temp' as $$
declare q text:=lower(trim(coalesce(p_query,'')));
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  return query select p.id,au.username,p.display_name,p.status from public.profiles p
    left join public.account_usernames au on au.user_id=p.id
    where q='' or lower(coalesce(au.username,'')) like '%'||q||'%' or lower(p.display_name) like '%'||q||'%'
    order by p.created_at desc limit least(greatest(coalesce(p_limit,20),1),50);
end;$$;

create or replace function public.admin_grant_role(p_user uuid,p_role text,p_expires_at timestamptz default null,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
declare a uuid:=(select auth.uid());
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_user is null or not exists(select 1 from public.profiles where id=p_user) then raise exception 'user_not_found'; end if;
  if p_role not in ('trust_safety','support','finance','analyst') then raise exception 'role_not_delegable'; end if;
  if p_expires_at is null then raise exception 'temporary_role_requires_expiry'; end if;
  if p_expires_at<=now() or p_expires_at>now()+interval '180 days' then raise exception 'invalid_expiry'; end if;
  insert into public.admin_user_roles(user_id,role_id,granted_by,granted_at,expires_at,grant_reason)
  values(p_user,p_role,a,now(),p_expires_at,left(nullif(trim(coalesce(p_reason,'')),''),500))
  on conflict(user_id,role_id) do update set granted_by=excluded.granted_by,granted_at=now(),expires_at=excluded.expires_at,grant_reason=excluded.grant_reason;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,after_summary)
  values(a,'admin_role_granted','user',p_user::text,left(p_reason,500),jsonb_build_object('role',p_role,'expires_at',p_expires_at));
  return jsonb_build_object('ok',true,'user_id',p_user,'role',p_role,'expires_at',p_expires_at);
end;$$;

create or replace function public.admin_revoke_role(p_user uuid,p_role text,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
declare a uuid:=(select auth.uid());n integer;
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_role='super_admin' then raise exception 'super_admin_not_revokable_here'; end if;
  delete from public.admin_user_roles where user_id=p_user and role_id=p_role;get diagnostics n=row_count;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,after_summary)
  values(a,'admin_role_revoked','user',p_user::text,left(p_reason,500),jsonb_build_object('role',p_role,'deleted',n));
  return jsonb_build_object('ok',true,'deleted',n);
end;$$;

create or replace function public.provider_credentials_complete(p_provider_slug text)
returns boolean language sql stable security definer set search_path='public','vault','pg_temp' as $$
  with provider as (select secret_env_refs from public.commercialization_providers where provider_slug=p_provider_slug),req as (select unnest(secret_env_refs) k from provider)
  select case when not exists(select 1 from req) then false else not exists(
    select 1 from req where not exists(select 1 from vault.decrypted_secrets s where s.name='citafuego/provider/'||p_provider_slug||'/'||req.k and nullif(trim(s.decrypted_secret),'') is not null)
  ) end;
$$;

create or replace function public.admin_get_provider_config_status()
returns table(provider_slug text,display_name text,provider_kind text,status text,public_config jsonb,account_reference text,required_keys text[],configured_keys text[],credentials_complete boolean,updated_at timestamptz)
language plpgsql security definer set search_path='public','vault','pg_temp' as $$
begin
  if not public.admin_has_any_role(array['super_admin','finance','analyst']) then raise exception 'forbidden' using errcode='42501'; end if;
  return query select p.provider_slug,p.display_name,p.provider_kind,p.status,p.public_config,p.account_reference,p.secret_env_refs,
    coalesce(array(select k from unnest(p.secret_env_refs) k where exists(select 1 from vault.decrypted_secrets s where s.name='citafuego/provider/'||p.provider_slug||'/'||k and nullif(trim(s.decrypted_secret),'') is not null) order by k),'{}'::text[]),
    public.provider_credentials_complete(p.provider_slug),p.updated_at from public.commercialization_providers p order by p.provider_slug;
end;$$;

create or replace function public.admin_set_provider_secret(p_provider_slug text,p_key text,p_value text)
returns jsonb language plpgsql security definer set search_path='public','vault','pg_temp' as $$
declare a uuid:=(select auth.uid());keys text[];secret_name text;secret_id uuid;complete boolean;
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  select secret_env_refs into keys from public.commercialization_providers where provider_slug=p_provider_slug for update;
  if keys is null then raise exception 'provider_not_found'; end if;if p_key is null or not (p_key=any(keys)) then raise exception 'invalid_provider_key'; end if;
  if p_value is null or length(p_value)>8000 then raise exception 'invalid_secret'; end if;
  secret_name:='citafuego/provider/'||p_provider_slug||'/'||p_key;select id into secret_id from vault.secrets where name=secret_name limit 1;
  if secret_id is null then secret_id:=vault.create_secret(p_value,secret_name,'CitaFuego provider credential managed by Super Admin');else perform vault.update_secret(secret_id,p_value,secret_name,'CitaFuego provider credential managed by Super Admin');end if;
  complete:=public.provider_credentials_complete(p_provider_slug);update public.commercialization_providers set status=case when complete then 'configured' else 'pending_credentials' end,updated_at=now() where provider_slug=p_provider_slug;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,after_summary) values(a,'provider_secret_updated','commercialization_provider',p_provider_slug,jsonb_build_object('key',p_key,'configured',nullif(trim(p_value),'') is not null,'credentials_complete',complete));
  return jsonb_build_object('ok',true,'provider',p_provider_slug,'key',p_key,'configured',nullif(trim(p_value),'') is not null,'credentials_complete',complete);
end;$$;

create or replace function public.admin_set_provider_public_config(p_provider_slug text,p_public_config jsonb default '{}'::jsonb,p_account_reference text default null)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
declare a uuid:=(select auth.uid());
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  update public.commercialization_providers set public_config=coalesce(p_public_config,'{}'::jsonb),account_reference=nullif(trim(p_account_reference),''),updated_at=now() where provider_slug=p_provider_slug;
  if not found then raise exception 'provider_not_found'; end if;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,after_summary) values(a,'provider_public_config_updated','commercialization_provider',p_provider_slug,jsonb_build_object('account_reference',nullif(trim(p_account_reference),''),'public_config',coalesce(p_public_config,'{}'::jsonb)));
  return jsonb_build_object('ok',true,'provider',p_provider_slug);
end;$$;

create or replace function public.backend_get_provider_config(p_provider_slug text)
returns jsonb language plpgsql security definer set search_path='public','vault','pg_temp' as $$
declare result jsonb;
begin
  select jsonb_build_object('providerSlug',p.provider_slug,'displayName',p.display_name,'status',p.status,'publicConfig',p.public_config,'accountReference',p.account_reference,'credentialsComplete',public.provider_credentials_complete(p.provider_slug),'secrets',coalesce((select jsonb_object_agg(k,coalesce((select s.decrypted_secret from vault.decrypted_secrets s where s.name='citafuego/provider/'||p.provider_slug||'/'||k order by s.updated_at desc limit 1),'')) from unnest(p.secret_env_refs) k),'{}'::jsonb)) into result from public.commercialization_providers p where p.provider_slug=p_provider_slug;
  return result;
end;$$;

revoke all on function public.provider_credentials_complete(text) from public,anon,authenticated;
revoke all on function public.backend_get_provider_config(text) from public,anon,authenticated;
grant execute on function public.backend_get_provider_config(text) to service_role;
revoke all on function public.admin_list_role_assignments() from public,anon;
revoke all on function public.admin_search_role_candidates(text,integer) from public,anon;
revoke all on function public.admin_grant_role(uuid,text,timestamptz,text) from public,anon;
revoke all on function public.admin_revoke_role(uuid,text,text) from public,anon;
revoke all on function public.admin_get_provider_config_status() from public,anon;
revoke all on function public.admin_set_provider_secret(text,text,text) from public,anon;
revoke all on function public.admin_set_provider_public_config(text,jsonb,text) from public,anon;
grant execute on function public.admin_list_role_assignments() to authenticated;
grant execute on function public.admin_search_role_candidates(text,integer) to authenticated;
grant execute on function public.admin_grant_role(uuid,text,timestamptz,text) to authenticated;
grant execute on function public.admin_revoke_role(uuid,text,text) to authenticated;
grant execute on function public.admin_get_provider_config_status() to authenticated;
grant execute on function public.admin_set_provider_secret(text,text,text) to authenticated;
grant execute on function public.admin_set_provider_public_config(text,jsonb,text) to authenticated;

-- Fix production Discover LATERAL scope: `me` must be introduced before the lateral interest aggregate references it.
create or replace function public.get_discover_candidates(p_limit integer default 20)
returns table(profile_id uuid,display_name text,age integer,district text,distance_bucket text,bio text,intent public.relationship_intent,verified boolean,primary_photo_path text,interests text[],shared_interest_count integer,chemistry_score integer)
language plpgsql security definer set search_path to 'public' as $function$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  return query
  with me as (
    select p.id,p.gender_identity,p.intent my_intent,p.verification_badge my_verified,p.city my_city,p.country_code my_country_code,extract(year from age(current_date,priv.birth_date))::int my_age,pref.min_age,pref.max_age,pref.max_distance_km,pref.interested_in,pref.intentions,pref.verified_only,loc.latitude my_lat,loc.longitude my_lon,array(select pi.interest_id from public.profile_interests pi where pi.user_id=p.id) my_interest_ids
    from public.profiles p join public.user_private priv on priv.user_id=p.id join public.dating_preferences pref on pref.user_id=p.id left join public.user_location_private loc on loc.user_id=p.id where p.id=v_user
  ),c as (
    select p.id,p.display_name,extract(year from age(current_date,priv.birth_date))::int candidate_age,p.district,p.bio,p.intent,p.verification_badge,p.last_active_at,p.profile_completion,cpref.interested_in candidate_interested_in,cpref.intentions candidate_intentions,cpref.verified_only candidate_verified_only,cpref.max_distance_km candidate_max_distance_km,me.gender_identity my_gender,me.my_intent,me.my_verified,me.my_age,me.min_age,me.max_age,me.max_distance_km,me.intentions,me.verified_only,
      case when me.my_lat is null or me.my_lon is null or loc.latitude is null or loc.longitude is null then null else 6371*acos(least(1.0,greatest(-1.0,cos(radians(me.my_lat))*cos(radians(loc.latitude))*cos(radians(loc.longitude)-radians(me.my_lon))+sin(radians(me.my_lat))*sin(radians(loc.latitude))))) end distance_km,
      photo.storage_path primary_photo_path,coalesce(ints.labels,'{}'::text[]) interest_labels,coalesce(ints.shared_count,0)::int shared_count
    from public.profiles p join public.user_private priv on priv.user_id=p.id join public.dating_preferences cpref on cpref.user_id=p.id left join public.user_location_private loc on loc.user_id=p.id
    cross join me
    left join lateral(select pp.storage_path from public.profile_photos pp where pp.user_id=p.id and pp.status='approved' order by pp.is_primary desc,pp.position asc,pp.created_at asc limit 1) photo on true
    left join lateral(select array_agg(i.label_es order by i.label_es) labels,count(*) filter(where pi.interest_id=any(me.my_interest_ids)) shared_count from public.profile_interests pi join public.interests i on i.id=pi.interest_id and i.active where pi.user_id=p.id) ints on true
    where p.id<>v_user and p.status='active' and p.city=me.my_city and p.country_code=me.my_country_code and (cardinality(me.interested_in)=0 or p.gender_identity=any(me.interested_in)) and (cardinality(cpref.interested_in)=0 or me.gender_identity=any(cpref.interested_in)) and me.my_age between cpref.min_age and cpref.max_age and (cardinality(cpref.intentions)=0 or me.my_intent=any(cpref.intentions)) and (not cpref.verified_only or me.my_verified) and not exists(select 1 from public.blocks b where (b.blocker_id=v_user and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=v_user)) and not exists(select 1 from public.interactions i where i.from_user_id=v_user and i.to_user_id=p.id)
  )
  select c.id,c.display_name,c.candidate_age,c.district,case when c.distance_km is null then 'Zona aproximada' when c.distance_km<1 then '<1 km' when c.distance_km<3 then '1–3 km' when c.distance_km<10 then '3–10 km' when c.distance_km<30 then '10–30 km' else '30+ km' end,c.bio,c.intent,c.verification_badge,c.primary_photo_path,c.interest_labels,c.shared_count,
    least(99,greatest(40,50+case when c.verification_badge then 8 else 0 end+least(c.shared_count*4,20)+case when c.distance_km is null then 0 when c.distance_km<3 then 10 when c.distance_km<10 then 6 else 2 end+case when c.intent=any(c.intentions) then 8 else 0 end+least(c.profile_completion/10,10)))::int
  from c where c.candidate_age between c.min_age and c.max_age and (cardinality(c.intentions)=0 or c.intent=any(c.intentions)) and (not c.verified_only or c.verification_badge) and (c.distance_km is null or c.distance_km<=least(c.max_distance_km,c.candidate_max_distance_km))
  order by 12 desc,c.verification_badge desc,c.last_active_at desc nulls last limit least(greatest(coalesce(p_limit,20),1),50);
end;$function$;
