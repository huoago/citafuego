-- Lifecycle funnel V2: separate historical registration residue from the current
-- operational cohort and repair any active-profile drift against the current
-- legal-consent activation contract.
--
-- The account-auth cutover is anchored to the verified Git commit that introduced
-- migration 074_username_password_accounts.sql: 2026-08-18T19:57:07Z.

create or replace function public.admin_get_lifecycle_funnel()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety','support','finance','analyst','growth','content','seo']::text[]) then
    raise exception 'forbidden';
  end if;

  with current_admins as (
    select distinct aur.user_id
    from public.admin_user_roles aur
    where aur.expires_at is null or aur.expires_at > now()
  ),
  raw_users as (
    select
      u.id,
      u.created_at,
      u.last_sign_in_at,
      coalesce(u.raw_app_meta_data->>'provider','email') as provider
    from auth.users u
    left join current_admins a on a.user_id = u.id
    where a.user_id is null
  ),
  classified_users as (
    select
      ru.*,
      (
        ru.created_at < timestamptz '2026-08-18 19:57:07+00'
        and ru.provider = 'email'
        and ru.last_sign_in_at is null
        and not exists (
          select 1 from public.account_usernames au where au.user_id = ru.id
        )
        and not exists (
          select 1 from public.profiles p where p.id = ru.id
        )
      ) as legacy_registration_residue
    from raw_users ru
  ),
  operational_users as (
    select cu.id
    from classified_users cu
    where not cu.legacy_registration_residue
  ),
  legal_consented as (
    select ce.user_id
    from public.consent_events ce
    join public.legal_document_versions ld
      on ld.document_type = ce.consent_type
     and ld.current_version = ce.document_version
    join operational_users ou on ou.id = ce.user_id
    where ce.granted
      and ce.consent_type in ('terms','privacy','sensitive_data')
    group by ce.user_id
    having count(distinct ce.consent_type) = 3
  ),
  approved_photo_users as (
    select distinct pp.user_id
    from public.profile_photos pp
    join operational_users ou on ou.id = pp.user_id
    where pp.status::text = 'approved'
  )
  select jsonb_build_object(
    -- Preserve the raw non-admin account total for auditability/backward compatibility.
    'realAccounts', (select count(*) from classified_users),
    'legacyRegistrationResidue', (select count(*) from classified_users where legacy_registration_residue),
    'operationalAccounts', (select count(*) from operational_users),
    'privateStarted', (select count(*) from public.user_private up join operational_users ou on ou.id = up.user_id),
    'legalConsented', (select count(*) from legal_consented),
    'profilesCreated', (select count(*) from public.profiles p join operational_users ou on ou.id = p.id),
    'activeProfiles', (select count(*) from public.profiles p join operational_users ou on ou.id = p.id where p.status::text = 'active'),
    'profiles80Plus', (select count(*) from public.profiles p join operational_users ou on ou.id = p.id where coalesce(p.profile_completion,0) >= 80),
    'usersWithApprovedPhotos', (select count(*) from approved_photo_users),
    'activeWithoutCurrentLegalConsent', (
      select count(*)
      from public.profiles p
      join operational_users ou on ou.id = p.id
      left join legal_consented lc on lc.user_id = p.id
      where p.status::text = 'active' and lc.user_id is null
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_get_lifecycle_funnel() from public;
revoke all on function public.admin_get_lifecycle_funnel() from anon;
grant execute on function public.admin_get_lifecycle_funnel() to authenticated;

-- Re-evaluate only profiles that are currently active while missing at least one
-- CURRENT legal-document consent. This does not delete accounts, profiles or data;
-- refresh_profile_activation_for() demotes a non-compliant public profile to
-- onboarding while preserving restricted/suspended/banned/deletion states.
do $$
declare
  r record;
begin
  for r in
    select p.id
    from public.profiles p
    where p.status::text = 'active'
      and (
        not exists (
          select 1
          from public.consent_events ce
          join public.legal_document_versions ld on ld.document_type = ce.consent_type
          where ce.user_id = p.id
            and ce.consent_type = 'terms'
            and ce.granted
            and ce.document_version = ld.current_version
        )
        or not exists (
          select 1
          from public.consent_events ce
          join public.legal_document_versions ld on ld.document_type = ce.consent_type
          where ce.user_id = p.id
            and ce.consent_type = 'privacy'
            and ce.granted
            and ce.document_version = ld.current_version
        )
        or not exists (
          select 1
          from public.consent_events ce
          join public.legal_document_versions ld on ld.document_type = ce.consent_type
          where ce.user_id = p.id
            and ce.consent_type = 'sensitive_data'
            and ce.granted
            and ce.document_version = ld.current_version
        )
      )
  loop
    perform public.refresh_profile_activation_for(r.id);
  end loop;
end
$$;
