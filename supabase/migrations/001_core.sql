-- CitaFuego V1.0 / 001_core.sql
-- Core account, public profile, private data, preferences and consent.

create extension if not exists pgcrypto;

create type public.account_status as enum (
  'onboarding', 'active', 'restricted', 'suspended', 'banned', 'deletion_requested', 'deleted'
);

create type public.relationship_intent as enum (
  'serious', 'meet_people', 'casual', 'friendship', 'open_to_see'
);

create type public.photo_status as enum (
  'pending', 'approved', 'rejected', 'removed'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Public-safe profile fields. Never add DOB, exact location, email, phone or risk score here.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 500),
  gender_identity text not null,
  city text not null default 'Lima',
  district text,
  country_code char(2) not null default 'PE',
  languages text[] not null default array['es']::text[],
  intent public.relationship_intent not null default 'open_to_see',
  occupation text,
  height_cm smallint check (height_cm is null or height_cm between 120 and 230),
  verification_badge boolean not null default false,
  profile_completion smallint not null default 0 check (profile_completion between 0 and 100),
  status public.account_status not null default 'onboarding',
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Sensitive account data. Owner and trusted backend only.
create table public.user_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date not null,
  age_verified_at timestamptz,
  legal_name text,
  phone_e164 text,
  deletion_requested_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_private_set_updated_at
before update on public.user_private
for each row execute function public.set_updated_at();

create table public.dating_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  interested_in text[] not null default '{}'::text[],
  min_age smallint not null default 21 check (min_age between 18 and 99),
  max_age smallint not null default 40 check (max_age between 18 and 99 and max_age >= min_age),
  max_distance_km smallint not null default 25 check (max_distance_km between 1 and 250),
  intentions public.relationship_intent[] not null default '{}'::public.relationship_intent[],
  verified_only boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger dating_preferences_set_updated_at
before update on public.dating_preferences
for each row execute function public.set_updated_at();

create table public.interests (
  id bigint generated always as identity primary key,
  slug text unique not null,
  label_es text not null,
  category text not null,
  active boolean not null default true
);

create table public.profile_interests (
  user_id uuid not null references auth.users(id) on delete cascade,
  interest_id bigint not null references public.interests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, interest_id)
);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  blurhash text,
  position smallint not null default 0 check (position between 0 and 8),
  status public.photo_status not null default 'pending',
  perceptual_hash text,
  moderation_event_id uuid,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, storage_path)
);

create index profile_photos_user_status_idx on public.profile_photos(user_id, status, position);

create trigger profile_photos_set_updated_at
before update on public.profile_photos
for each row execute function public.set_updated_at();

-- Exact coordinates are private and must never be selected into public profile payloads.
create table public.user_location_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  accuracy_m integer,
  source text not null default 'manual' check (source in ('gps','manual','ip_approx')),
  geohash_private text,
  district text,
  city text not null default 'Lima',
  updated_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  document_version text not null,
  granted boolean not null,
  source text not null default 'web',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index consent_events_user_type_idx on public.consent_events(user_id, consent_type, created_at desc);

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_fingerprint_hash text not null,
  platform text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  trusted boolean not null default false,
  unique(user_id, device_fingerprint_hash)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.user_private enable row level security;
alter table public.dating_preferences enable row level security;
alter table public.interests enable row level security;
alter table public.profile_interests enable row level security;
alter table public.profile_photos enable row level security;
alter table public.user_location_private enable row level security;
alter table public.consent_events enable row level security;
alter table public.user_devices enable row level security;

-- Direct table reads are self-only to prevent bulk profile scraping. Discovery uses a bounded RPC.
create policy profiles_select_self
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_self
on public.profiles for insert
to authenticated
with check (id = auth.uid() and verification_badge = false and status = 'onboarding' and profile_completion = 0);

create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Prevent clients from self-verifying or self-activating through column-level privileges.
revoke insert, update on public.profiles from authenticated;
grant insert (id, display_name, bio, gender_identity, city, district, country_code, languages, intent, occupation, height_cm, last_active_at) on public.profiles to authenticated;
grant update (display_name, bio, gender_identity, city, district, country_code, languages, intent, occupation, height_cm, last_active_at) on public.profiles to authenticated;

create policy user_private_self_read
on public.user_private for select
to authenticated
using (user_id = auth.uid());

create policy user_private_self_insert
on public.user_private for insert
to authenticated
with check (user_id = auth.uid());

create policy user_private_self_update
on public.user_private for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke insert, update on public.user_private from authenticated;
grant insert (user_id, birth_date, legal_name, phone_e164) on public.user_private to authenticated;
grant update (birth_date, legal_name, phone_e164, deletion_requested_at) on public.user_private to authenticated;

create policy dating_preferences_self_all
on public.dating_preferences for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy interests_read
on public.interests for select
to authenticated
using (active = true);

create policy profile_interests_read_self
on public.profile_interests for select
to authenticated
using (user_id = auth.uid());

create policy profile_interests_write_self
on public.profile_interests for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy profile_photos_read_self
on public.profile_photos for select
to authenticated
using (user_id = auth.uid());

create policy profile_photos_write_self
on public.profile_photos for insert
to authenticated
with check (user_id = auth.uid() and status = 'pending');

create policy profile_photos_update_self_pending
on public.profile_photos for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke insert, update on public.profile_photos from authenticated;
grant insert (user_id, storage_path, blurhash, position, is_primary) on public.profile_photos to authenticated;
grant update (position, is_primary) on public.profile_photos to authenticated;

create policy location_self_all
on public.user_location_private for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy consent_self_read
on public.consent_events for select
to authenticated
using (user_id = auth.uid());

create policy consent_self_insert
on public.consent_events for insert
to authenticated
with check (user_id = auth.uid());

create policy devices_self_read
on public.user_devices for select
to authenticated
using (user_id = auth.uid());
