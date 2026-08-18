-- CitaFuego V12: username/password accounts with optional contact binding.
-- Usernames are never exposed through the Data API; only the server service role can resolve them.

create table if not exists public.account_usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  normalized_username text not null unique,
  created_at timestamptz not null default now(),
  constraint account_username_format check (username ~ '^[A-Za-z0-9][A-Za-z0-9._-]{3,23}$'),
  constraint account_username_normalized check (normalized_username=lower(username))
);

alter table public.account_usernames enable row level security;
revoke all on table public.account_usernames from public,anon,authenticated;
grant select,insert,update,delete on table public.account_usernames to service_role;

-- Username/password identities use an internal non-deliverable email only as the
-- initial Supabase Auth credential carrier. The username maps to user_id, not to
-- that email, so later email binding/replacement never breaks username login.
create or replace function public.handle_citafuego_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public','auth'
as $$
declare
  v_birth date;
  v_terms text;
  v_privacy text;
  v_sensitive text;
  v_provider text:=coalesce(new.raw_app_meta_data->>'provider','email');
  v_username_account boolean:=coalesce(new.email,'') like '%@accounts.citafuego.invalid';
begin
  begin
    v_birth:=nullif(new.raw_user_meta_data->>'birth_date','')::date;
  exception when others then
    if v_provider in ('google','phone') or v_username_account then return new; end if;
    raise exception 'invalid_birth_date';
  end;

  v_terms:=nullif(new.raw_user_meta_data->>'terms_version','');
  v_privacy:=nullif(new.raw_user_meta_data->>'privacy_version','');
  v_sensitive:=nullif(new.raw_user_meta_data->>'sensitive_data_version','');

  if v_birth is null or v_terms is null or v_privacy is null or v_sensitive is null then
    if v_provider in ('google','phone') or v_username_account then return new; end if;
    raise exception 'legal_consent_required';
  end if;

  if not public.is_adult(v_birth) then raise exception 'adult_only'; end if;
  if v_terms<>(select current_version from public.legal_document_versions where document_type='terms')
     or v_privacy<>(select current_version from public.legal_document_versions where document_type='privacy')
     or v_sensitive<>(select current_version from public.legal_document_versions where document_type='sensitive_data') then
    raise exception 'legal_consent_version_invalid';
  end if;

  insert into public.user_private(user_id,birth_date,phone_e164,phone_verified_at)
  values(new.id,v_birth,new.phone,case when new.phone_confirmed_at is not null then now() else null end)
  on conflict(user_id) do update set
    birth_date=excluded.birth_date,
    phone_e164=coalesce(public.user_private.phone_e164,excluded.phone_e164),
    phone_verified_at=coalesce(public.user_private.phone_verified_at,excluded.phone_verified_at),
    updated_at=now();

  insert into public.dating_preferences(user_id) values(new.id) on conflict(user_id) do nothing;
  insert into public.consent_events(user_id,consent_type,document_version,granted,source)
  values(new.id,'terms',v_terms,true,'web_signup'),
        (new.id,'privacy',v_privacy,true,'web_signup'),
        (new.id,'sensitive_data',v_sensitive,true,'web_signup');
  return new;
end;
$$;

revoke all on function public.handle_citafuego_new_user() from public,anon,authenticated;
