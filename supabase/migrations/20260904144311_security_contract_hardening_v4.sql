-- Security contract hardening v4
-- Goals:
-- 1) keep public operational feature checks available without SECURITY DEFINER;
-- 2) make intentionally fail-closed backend tables explicit to the linter;
-- 3) restore and pin the authenticated EXECUTE contract for core RPCs that had historical permission regressions.

create table if not exists public.public_operational_flags(
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint public_operational_flags_key_check check(
    key = any(array[
      'ACCOUNT_LOGIN_ENABLED',
      'EMAIL_LOGIN_ENABLED',
      'EMAIL_REGISTRATION_ENABLED',
      'GOOGLE_LOGIN_ENABLED',
      'BLOG_MEDIA_ENABLED',
      'STORY_MEDIA_ENABLED'
    ]::text[])
  )
);

alter table public.public_operational_flags enable row level security;
revoke all on table public.public_operational_flags from public, anon, authenticated;
grant select on table public.public_operational_flags to anon, authenticated;

drop policy if exists public_operational_flags_read on public.public_operational_flags;
create policy public_operational_flags_read
  on public.public_operational_flags
  for select
  to anon, authenticated
  using (true);

insert into public.public_operational_flags(key,enabled,updated_at)
select allowed.key, coalesce(f.enabled,false), now()
from unnest(array[
  'ACCOUNT_LOGIN_ENABLED',
  'EMAIL_LOGIN_ENABLED',
  'EMAIL_REGISTRATION_ENABLED',
  'GOOGLE_LOGIN_ENABLED',
  'BLOG_MEDIA_ENABLED',
  'STORY_MEDIA_ENABLED'
]::text[]) as allowed(key)
left join public.feature_flags f on f.key=allowed.key
on conflict(key) do update set enabled=excluded.enabled,updated_at=excluded.updated_at;

create or replace function public.sync_public_operational_flag()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  allowed_keys constant text[]:=array[
    'ACCOUNT_LOGIN_ENABLED',
    'EMAIL_LOGIN_ENABLED',
    'EMAIL_REGISTRATION_ENABLED',
    'GOOGLE_LOGIN_ENABLED',
    'BLOG_MEDIA_ENABLED',
    'STORY_MEDIA_ENABLED'
  ];
begin
  if tg_op='DELETE' then
    if old.key=any(allowed_keys) then
      delete from public.public_operational_flags where key=old.key;
    end if;
    return old;
  end if;

  if tg_op='UPDATE' and old.key is distinct from new.key and old.key=any(allowed_keys) then
    delete from public.public_operational_flags where key=old.key;
  end if;

  if new.key=any(allowed_keys) then
    insert into public.public_operational_flags(key,enabled,updated_at)
    values(new.key,coalesce(new.enabled,false),now())
    on conflict(key) do update set enabled=excluded.enabled,updated_at=excluded.updated_at;
  end if;
  return new;
end;$$;

revoke all on function public.sync_public_operational_flag() from public, anon, authenticated;

drop trigger if exists feature_flags_sync_public_operational on public.feature_flags;
create trigger feature_flags_sync_public_operational
  after insert or update or delete on public.feature_flags
  for each row execute function public.sync_public_operational_flag();

create or replace function public.public_feature_enabled(p_key text)
returns boolean
language sql
stable
security invoker
set search_path='public','pg_temp'
as $$
  select coalesce(
    (select f.enabled from public.public_operational_flags f where f.key=p_key),
    false
  );
$$;
revoke all on function public.public_feature_enabled(text) from public;
grant execute on function public.public_feature_enabled(text) to anon, authenticated;

-- Backend/RPC-only tables remain explicitly fail-closed to direct client access.
drop policy if exists account_deletion_jobs_direct_clients_denied on public.account_deletion_jobs;
create policy account_deletion_jobs_direct_clients_denied
  on public.account_deletion_jobs as restrictive for all to anon,authenticated
  using(false) with check(false);

drop policy if exists admin_membership_grants_direct_clients_denied on public.admin_membership_grants;
create policy admin_membership_grants_direct_clients_denied
  on public.admin_membership_grants as restrictive for all to anon,authenticated
  using(false) with check(false);

drop policy if exists admin_operation_settings_direct_clients_denied on public.admin_operation_settings;
create policy admin_operation_settings_direct_clients_denied
  on public.admin_operation_settings as restrictive for all to anon,authenticated
  using(false) with check(false);

drop policy if exists membership_plans_direct_clients_denied on public.membership_plans;
create policy membership_plans_direct_clients_denied
  on public.membership_plans as restrictive for all to anon,authenticated
  using(false) with check(false);

drop policy if exists site_settings_direct_clients_denied on public.site_settings;
create policy site_settings_direct_clients_denied
  on public.site_settings as restrictive for all to anon,authenticated
  using(false) with check(false);

-- Regression contract for authenticated application/admin RPCs that suffered historical permission regressions.
revoke execute on function public.get_my_matches(integer) from public,anon;
grant execute on function public.get_my_matches(integer) to authenticated;

revoke execute on function public.get_discover_page_v3(integer,integer) from public,anon;
grant execute on function public.get_discover_page_v3(integer,integer) to authenticated;

revoke execute on function public.get_my_date_proposals() from public,anon;
grant execute on function public.get_my_date_proposals() to authenticated;

revoke execute on function public.get_private_albums() from public,anon;
grant execute on function public.get_private_albums() to authenticated;

revoke execute on function public.get_my_chat_unread_counts() from public,anon;
grant execute on function public.get_my_chat_unread_counts() to authenticated;

revoke execute on function public.get_who_likes_me(integer,integer) from public,anon;
grant execute on function public.get_who_likes_me(integer,integer) to authenticated;

revoke execute on function public.admin_get_monetization_metrics(integer) from public,anon;
grant execute on function public.admin_get_monetization_metrics(integer) to authenticated;

revoke execute on function public.admin_get_provider_config_status() from public,anon;
grant execute on function public.admin_get_provider_config_status() to authenticated;
