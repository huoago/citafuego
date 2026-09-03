-- The matches table stores its creation timestamp as matched_at, not created_at.
create or replace function public.admin_get_dashboard_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  inactive_days int:=90;
  result jsonb;
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety','support','finance','analyst','growth','content','seo']) then raise exception 'forbidden' using errcode='42501'; end if;
  select coalesce((value #>> '{}')::int,90) into inactive_days from public.admin_operation_settings where key='inactive_user_days';
  with user_base as (
    select u.id,u.created_at,u.last_sign_in_at,
      coalesce(u.last_sign_in_at,u.created_at) as activity_at,
      p.status,p.verification_badge,p.identity_verification_badge,p.profile_completion,
      exists(select 1 from public.admin_user_roles aur where aur.user_id=u.id and (aur.expires_at is null or aur.expires_at>now())) as is_admin
    from auth.users u
    left join public.profiles p on p.id=u.id
  )
  select jsonb_build_object(
    'inactivePolicyDays',inactive_days,
    'users',jsonb_build_object(
      'total',(select count(*) from user_base where not is_admin),
      'new24h',(select count(*) from user_base where not is_admin and created_at>=now()-interval '24 hours'),
      'new7d',(select count(*) from user_base where not is_admin and created_at>=now()-interval '7 days'),
      'new30d',(select count(*) from user_base where not is_admin and created_at>=now()-interval '30 days'),
      'active24h',(select count(*) from user_base where not is_admin and last_sign_in_at>=now()-interval '24 hours'),
      'active7d',(select count(*) from user_base where not is_admin and last_sign_in_at>=now()-interval '7 days'),
      'active30d',(select count(*) from user_base where not is_admin and last_sign_in_at>=now()-interval '30 days'),
      'inactive90d',(select count(*) from user_base where not is_admin and activity_at<now()-interval '90 days'),
      'inactivePolicy',(select count(*) from user_base where not is_admin and activity_at<now()-make_interval(days=>inactive_days)),
      'neverSignedIn',(select count(*) from user_base where not is_admin and last_sign_in_at is null),
      'suspended',(select count(*) from user_base where not is_admin and status='suspended'),
      'banned',(select count(*) from user_base where not is_admin and status='banned'),
      'deletionRequested',(select count(*) from user_base where not is_admin and status='deletion_requested'),
      'deleted',(select count(*) from user_base where not is_admin and status='deleted')
    ),
    'quality',jsonb_build_object(
      'profileComplete',(select count(*) from user_base where not is_admin and profile_completion>=80),
      'selfieVerified',(select count(*) from user_base where not is_admin and verification_badge=true),
      'identityVerified',(select count(*) from user_base where not is_admin and identity_verification_badge=true),
      'phoneVerified',(select count(*) from public.user_private up where up.phone_verified_at is not null and not exists(select 1 from public.admin_user_roles aur where aur.user_id=up.user_id and (aur.expires_at is null or aur.expires_at>now())))
    ),
    'safety',jsonb_build_object(
      'openReports',(select count(*) from public.reports where status in ('open','triaged','investigating')),
      'pendingAppeals',(select count(*) from public.appeals where status in ('submitted','pending')),
      'activeSanctions',(select count(*) from public.sanctions where active=true and (ends_at is null or ends_at>now())),
      'pendingPhotos',(select count(*) from public.profile_photos where status::text='pending')
    ),
    'engagement',jsonb_build_object(
      'likes7d',(select count(*) from public.interactions where action='like' and created_at>=now()-interval '7 days'),
      'matches7d',(select count(*) from public.matches where matched_at>=now()-interval '7 days'),
      'messages7d',(select count(*) from public.messages where created_at>=now()-interval '7 days')
    ),
    'deletionJobs',jsonb_build_object(
      'pending',(select count(*) from public.account_deletion_jobs where status='pending'),
      'due',(select count(*) from public.account_deletion_jobs where status='pending' and scheduled_for<=now())
    )
  ) into result;
  return result;
end;
$function$;
