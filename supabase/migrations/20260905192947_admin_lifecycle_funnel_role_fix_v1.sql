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
  real_users as (
    select u.id
    from auth.users u
    left join current_admins a on a.user_id = u.id
    where a.user_id is null
  ),
  legal_consented as (
    select ce.user_id
    from public.consent_events ce
    join real_users ru on ru.id = ce.user_id
    group by ce.user_id
    having bool_or(ce.consent_type = 'terms' and ce.granted)
       and bool_or(ce.consent_type = 'privacy' and ce.granted)
       and bool_or(ce.consent_type = 'sensitive_data' and ce.granted)
  ),
  approved_photo_users as (
    select distinct pp.user_id
    from public.profile_photos pp
    join real_users ru on ru.id = pp.user_id
    where pp.status::text = 'approved'
  )
  select jsonb_build_object(
    'realAccounts', (select count(*) from real_users),
    'privateStarted', (select count(*) from public.user_private up join real_users ru on ru.id = up.user_id),
    'legalConsented', (select count(*) from legal_consented),
    'profilesCreated', (select count(*) from public.profiles p join real_users ru on ru.id = p.id),
    'activeProfiles', (select count(*) from public.profiles p join real_users ru on ru.id = p.id where p.status::text = 'active'),
    'profiles80Plus', (select count(*) from public.profiles p join real_users ru on ru.id = p.id where coalesce(p.profile_completion,0) >= 80),
    'usersWithApprovedPhotos', (select count(*) from approved_photo_users)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_get_lifecycle_funnel() from public;
revoke all on function public.admin_get_lifecycle_funnel() from anon;
grant execute on function public.admin_get_lifecycle_funnel() to authenticated;
