-- CitaFuego top-tier product polish: safe multi-photo discovery and privacy-aware push foundation.

create or replace function public.get_visible_profile_photo_paths(p_profiles uuid[])
returns table(profile_id uuid,storage_path text,position integer,is_primary boolean)
language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();
begin
  if u is null then raise exception 'not_authenticated'; end if;
  return query
  select pp.user_id,pp.storage_path,pp.position,pp.is_primary
  from public.profile_photos pp
  join public.profiles p on p.id=pp.user_id and p.status='active'
  where pp.status='approved'
    and pp.user_id=any(coalesce(p_profiles,array[]::uuid[]))
    and (pp.user_id=u or public.can_view_social_profile(pp.user_id,u))
    and not exists(select 1 from public.blocks b where (b.blocker_id=u and b.blocked_id=pp.user_id) or (b.blocker_id=pp.user_id and b.blocked_id=u))
  order by pp.user_id,pp.is_primary desc,pp.position asc;
end; $$;
revoke all on function public.get_visible_profile_photo_paths(uuid[]) from public,anon;
grant execute on function public.get_visible_profile_photo_paths(uuid[]) to authenticated;

create table if not exists public.push_subscriptions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint_hash text not null,
  endpoint_ciphertext text not null,
  p256dh_ciphertext text not null,
  auth_ciphertext text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(user_id,endpoint_hash)
);
create index if not exists push_subscriptions_user_active_idx on public.push_subscriptions(user_id,last_seen_at desc) where revoked_at is null;
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon,authenticated;
comment on table public.push_subscriptions is 'Server-managed encrypted Web Push subscription material. Never exposed through direct client table access.';

create table if not exists public.user_trust_preferences(
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_only_likes boolean not null default false,
  verified_only_chat boolean not null default false,
  verified_only_random boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.user_trust_preferences enable row level security;
drop policy if exists user_trust_preferences_self_read on public.user_trust_preferences;
create policy user_trust_preferences_self_read on public.user_trust_preferences for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.user_trust_preferences from authenticated,anon;
grant select on public.user_trust_preferences to authenticated;

create or replace function public.set_my_trust_preferences(p_verified_only_likes boolean,p_verified_only_chat boolean,p_verified_only_random boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();begin
 if u is null then raise exception 'not_authenticated'; end if;
 insert into public.user_trust_preferences(user_id,verified_only_likes,verified_only_chat,verified_only_random,updated_at)
 values(u,coalesce(p_verified_only_likes,false),coalesce(p_verified_only_chat,false),coalesce(p_verified_only_random,true),now())
 on conflict(user_id) do update set verified_only_likes=excluded.verified_only_likes,verified_only_chat=excluded.verified_only_chat,verified_only_random=excluded.verified_only_random,updated_at=now();
 return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.set_my_trust_preferences(boolean,boolean,boolean) from public,anon;
grant execute on function public.set_my_trust_preferences(boolean,boolean,boolean) to authenticated;
