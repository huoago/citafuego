-- CitaFuego admin operations + user lifecycle control plane v2
-- Applied to production as admin_operations_user_lifecycle_v2 plus runtime fix.

insert into public.admin_roles(id,name,permissions) values
 ('growth','Growth','["users.read","growth.*","invites.*","boosts.read"]'::jsonb),
 ('content','Content','["content.*","blog.*","safety.read"]'::jsonb),
 ('seo','SEO','["seo.*","content.read","health.read"]'::jsonb)
on conflict(id) do update set name=excluded.name, permissions=excluded.permissions;

create table if not exists public.admin_operation_settings(
  key text primary key,
  category text not null default 'operations',
  value jsonb not null,
  description text not null default '',
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.admin_operation_settings enable row level security;
revoke all on public.admin_operation_settings from public, anon, authenticated;

insert into public.admin_operation_settings(key,category,value,description) values
 ('inactive_user_days','user_lifecycle','90'::jsonb,'Days without a successful sign-in before an account is considered inactive.'),
 ('account_delete_grace_days','user_lifecycle','7'::jsonb,'Grace period between deletion request and final anonymization.'),
 ('auto_flag_inactive_users','user_lifecycle','false'::jsonb,'Automatically flag inactive accounts for review; does not delete accounts.'),
 ('auto_delete_inactive_users','user_lifecycle','false'::jsonb,'Must remain false unless a separately approved retention policy is adopted.'),
 ('account_deletion_enabled','user_lifecycle','true'::jsonb,'Allow Super Admin to request and finalize account deletion.'),
 ('destructive_actions_require_confirm_text','security','true'::jsonb,'Require explicit confirmation text for destructive account operations.'),
 ('destructive_actions_require_aal2','security','false'::jsonb,'Enable after Super Admin MFA enrollment is verified.'),
 ('commercialization_threshold','commercialization','100'::jsonb,'Qualified real-user threshold before paid commercialization can be enabled.')
on conflict(key) do nothing;

create table if not exists public.account_deletion_jobs(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  requested_by uuid not null,
  reason text not null,
  status text not null default 'pending' check(status in ('pending','cancelled','completed','failed')),
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null,
  cancelled_at timestamptz,
  cancelled_by uuid,
  completed_at timestamptz,
  completed_by uuid,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists account_deletion_jobs_user_idx on public.account_deletion_jobs(user_id,requested_at desc);
create index if not exists account_deletion_jobs_status_idx on public.account_deletion_jobs(status,scheduled_for);
alter table public.account_deletion_jobs enable row level security;
revoke all on public.account_deletion_jobs from public, anon, authenticated;

create or replace function public.admin_get_operation_settings()
returns table(key text, category text, value jsonb, description text, updated_at timestamptz)
language plpgsql stable security definer set search_path='public','pg_temp' as $$
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety','support','finance','analyst','growth','content','seo']) then raise exception 'forbidden' using errcode='42501'; end if;
  return query select s.key,s.category,s.value,s.description,s.updated_at from public.admin_operation_settings s order by s.category,s.key;
end;$$;

create or replace function public.admin_set_operation_setting(p_key text,p_value jsonb,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
declare a uuid:=auth.uid(); old_value jsonb;
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_key not in ('inactive_user_days','account_delete_grace_days','auto_flag_inactive_users','auto_delete_inactive_users','account_deletion_enabled','destructive_actions_require_confirm_text','destructive_actions_require_aal2','commercialization_threshold') then raise exception 'unsupported_setting'; end if;
  select value into old_value from public.admin_operation_settings where key=p_key for update;
  if old_value is null then raise exception 'setting_not_found'; end if;
  if p_key='inactive_user_days' and ((p_value #>> '{}')::int < 30 or (p_value #>> '{}')::int > 730) then raise exception 'inactive_days_out_of_range'; end if;
  if p_key='account_delete_grace_days' and ((p_value #>> '{}')::int < 0 or (p_value #>> '{}')::int > 90) then raise exception 'grace_days_out_of_range'; end if;
  if p_key='commercialization_threshold' and ((p_value #>> '{}')::int < 100) then raise exception 'commercialization_threshold_below_policy'; end if;
  if p_key='auto_delete_inactive_users' and (p_value #>> '{}')::boolean then raise exception 'automatic_inactive_deletion_not_allowed'; end if;
  update public.admin_operation_settings set value=p_value,updated_by=a,updated_at=now() where key=p_key;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(a,'operation_setting_changed','setting',p_key,left(nullif(trim(coalesce(p_reason,'')),''),500),jsonb_build_object('value',old_value),jsonb_build_object('value',p_value));
  return jsonb_build_object('ok',true,'key',p_key,'value',p_value);
end;$$;

create or replace function public.admin_get_dashboard_v2()
returns jsonb language plpgsql stable security definer set search_path='public','auth','pg_temp' as $$
declare inactive_days int:=90; result jsonb;
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety','support','finance','analyst','growth','content','seo']) then raise exception 'forbidden' using errcode='42501'; end if;
  select coalesce((value #>> '{}')::int,90) into inactive_days from public.admin_operation_settings where key='inactive_user_days';
  with user_base as (
    select u.id,u.created_at,u.last_sign_in_at,coalesce(u.last_sign_in_at,u.created_at) activity_at,p.status,p.verification_badge,p.identity_verification_badge,p.profile_completion,
      exists(select 1 from public.admin_user_roles aur where aur.user_id=u.id and (aur.expires_at is null or aur.expires_at>now())) is_admin
    from auth.users u left join public.profiles p on p.id=u.id
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
      'matches7d',(select count(*) from public.matches where created_at>=now()-interval '7 days'),
      'messages7d',(select count(*) from public.messages where created_at>=now()-interval '7 days')
    ),
    'deletionJobs',jsonb_build_object(
      'pending',(select count(*) from public.account_deletion_jobs where status='pending'),
      'due',(select count(*) from public.account_deletion_jobs where status='pending' and scheduled_for<=now())
    )
  ) into result;
  return result;
end;$$;

create or replace function public.admin_get_users_v2(p_query text default null,p_limit integer default 100,p_status text default null,p_inactive_days integer default null,p_district text default null)
returns table(user_id uuid,display_name text,email text,phone_masked text,status public.account_status,district text,created_at timestamptz,last_sign_in_at timestamptz,days_since_login integer,never_signed_in boolean,inactive_90d boolean,profile_completion smallint,selfie_verified boolean,identity_verified boolean,phone_verified boolean,reports_received bigint,active_sanctions bigint,deletion_requested_at timestamptz,deleted_at timestamptz,is_admin boolean)
language plpgsql stable security definer set search_path='public','auth','pg_temp' as $$
declare q text:=nullif(trim(coalesce(p_query,'')),''); lim integer:=least(greatest(coalesce(p_limit,100),1),250);
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety','support','analyst','growth']) then raise exception 'forbidden' using errcode='42501'; end if;
  return query select u.id,p.display_name,u.email::text,
    case when up.phone_e164 is null then null when length(up.phone_e164)<=4 then '****' else repeat('*',greatest(length(up.phone_e164)-4,4))||right(up.phone_e164,4) end,
    p.status,p.district,u.created_at,u.last_sign_in_at,
    case when u.last_sign_in_at is null then null else floor(extract(epoch from(now()-u.last_sign_in_at))/86400)::int end,
    u.last_sign_in_at is null,coalesce(u.last_sign_in_at,u.created_at)<now()-interval '90 days',p.profile_completion,p.verification_badge,p.identity_verification_badge,up.phone_verified_at is not null,
    (select count(*) from public.reports r where r.reported_user_id=u.id),
    (select count(*) from public.sanctions s where s.user_id=u.id and s.active=true and (s.ends_at is null or s.ends_at>now())),up.deletion_requested_at,up.deleted_at,
    exists(select 1 from public.admin_user_roles aur where aur.user_id=u.id and (aur.expires_at is null or aur.expires_at>now()))
  from auth.users u left join public.profiles p on p.id=u.id left join public.user_private up on up.user_id=u.id
  where (q is null or u.id::text ilike '%'||q||'%' or coalesce(u.email,'') ilike '%'||q||'%' or coalesce(p.display_name,'') ilike '%'||q||'%' or coalesce(up.phone_e164,'') ilike '%'||q||'%')
    and (p_status is null or p.status::text=p_status) and (p_district is null or p.district=p_district)
    and (p_inactive_days is null or coalesce(u.last_sign_in_at,u.created_at)<now()-make_interval(days=>greatest(p_inactive_days,1)))
  order by coalesce(u.last_sign_in_at,u.created_at) desc nulls last limit lim;
end;$$;

create or replace function public.admin_get_deletion_jobs(p_limit integer default 100)
returns table(job_id uuid,user_id uuid,display_name text,email text,status text,reason text,requested_at timestamptz,scheduled_for timestamptz,completed_at timestamptz,requested_by uuid)
language plpgsql stable security definer set search_path='public','auth','pg_temp' as $$
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety','support']) then raise exception 'forbidden' using errcode='42501'; end if;
  return query select j.id,j.user_id,p.display_name,u.email::text,j.status,j.reason,j.requested_at,j.scheduled_for,j.completed_at,j.requested_by
  from public.account_deletion_jobs j left join public.profiles p on p.id=j.user_id left join auth.users u on u.id=j.user_id
  order by j.requested_at desc limit least(greatest(coalesce(p_limit,100),1),250);
end;$$;

create or replace function public.admin_change_account_status(p_user uuid,p_status public.account_status,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
declare a uuid:=auth.uid(); before_status public.account_status;
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_user=a then raise exception 'cannot_change_own_account_status'; end if;
  if exists(select 1 from public.admin_user_roles aur where aur.user_id=p_user and (aur.expires_at is null or aur.expires_at>now())) then raise exception 'admin_account_status_requires_access_workflow'; end if;
  if p_status not in ('active','restricted','suspended','banned') then raise exception 'unsupported_status'; end if;
  select status into before_status from public.profiles where id=p_user for update;
  if before_status is null then raise exception 'user_not_found'; end if;
  update public.profiles set status=p_status,updated_at=now() where id=p_user;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(a,'account_status_changed','user',p_user::text,left(nullif(trim(coalesce(p_reason,'')),''),500),jsonb_build_object('status',before_status),jsonb_build_object('status',p_status));
  return jsonb_build_object('ok',true,'user_id',p_user,'before',before_status,'after',p_status);
end;$$;

create or replace function public.admin_request_account_deletion(p_user uuid,p_reason text,p_confirmation text)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
declare a uuid:=auth.uid(); grace_days int:=7; job_id uuid; before_status public.account_status;
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_confirmation<>'CONFIRM' then raise exception 'confirmation_required'; end if;
  if p_user=a then raise exception 'cannot_delete_self'; end if;
  if exists(select 1 from public.admin_user_roles aur where aur.user_id=p_user and (aur.expires_at is null or aur.expires_at>now())) then raise exception 'cannot_delete_admin_account'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required'; end if;
  select status into before_status from public.profiles where id=p_user for update;
  if before_status is null then raise exception 'user_not_found'; end if;
  if before_status='deleted' then raise exception 'already_deleted'; end if;
  if exists(select 1 from public.account_deletion_jobs where user_id=p_user and status='pending') then raise exception 'deletion_already_pending'; end if;
  select coalesce((value #>> '{}')::int,7) into grace_days from public.admin_operation_settings where key='account_delete_grace_days';
  insert into public.account_deletion_jobs(user_id,requested_by,reason,scheduled_for,metadata)
  values(p_user,a,left(trim(p_reason),1000),now()+make_interval(days=>grace_days),jsonb_build_object('previous_status',before_status)) returning id into job_id;
  update public.profiles set status='deletion_requested',updated_at=now() where id=p_user;
  update public.user_private set deletion_requested_at=now(),updated_at=now() where user_id=p_user;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(a,'account_deletion_requested','user',p_user::text,left(trim(p_reason),500),jsonb_build_object('status',before_status),jsonb_build_object('status','deletion_requested','job_id',job_id));
  return jsonb_build_object('ok',true,'job_id',job_id,'scheduled_for',now()+make_interval(days=>grace_days));
end;$$;

create or replace function public.admin_cancel_account_deletion(p_job uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
declare a uuid:=auth.uid(); target uuid; previous_status public.account_status:='active';
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  select user_id,(metadata->>'previous_status')::public.account_status into target,previous_status from public.account_deletion_jobs where id=p_job and status='pending' for update;
  if target is null then raise exception 'pending_job_not_found'; end if;
  update public.account_deletion_jobs set status='cancelled',cancelled_at=now(),cancelled_by=a,metadata=metadata||jsonb_build_object('cancel_reason',left(coalesce(p_reason,''),500)) where id=p_job;
  update public.profiles set status=coalesce(previous_status,'active'),updated_at=now() where id=target and status='deletion_requested';
  update public.user_private set deletion_requested_at=null,updated_at=now() where user_id=target and deleted_at is null;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(a,'account_deletion_cancelled','user',target::text,left(nullif(trim(coalesce(p_reason,'')),''),500),jsonb_build_object('job_id',p_job),jsonb_build_object('status',coalesce(previous_status,'active')));
  return jsonb_build_object('ok',true,'job_id',p_job,'user_id',target);
end;$$;

create or replace function public.admin_finalize_account_deletion(p_job uuid,p_confirmation text,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='public','auth','pg_temp' as $$
declare a uuid:=auth.uid(); target uuid; scheduled timestamptz; target_email text; require_aal2 boolean:=false; jwt_aal text:=coalesce(auth.jwt()->>'aal','aal1');
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_confirmation<>'DELETE' then raise exception 'delete_confirmation_required'; end if;
  if exists(select 1 from public.admin_operation_settings where key='account_deletion_enabled' and (value #>> '{}')::boolean=false) then raise exception 'account_deletion_disabled'; end if;
  select coalesce((value #>> '{}')::boolean,false) into require_aal2 from public.admin_operation_settings where key='destructive_actions_require_aal2';
  if require_aal2 and jwt_aal<>'aal2' then raise exception 'aal2_required' using errcode='42501'; end if;
  select user_id,scheduled_for into target,scheduled from public.account_deletion_jobs where id=p_job and status='pending' for update;
  if target is null then raise exception 'pending_job_not_found'; end if;
  if target=a then raise exception 'cannot_delete_self'; end if;
  if exists(select 1 from public.admin_user_roles aur where aur.user_id=target and (aur.expires_at is null or aur.expires_at>now())) then raise exception 'cannot_delete_admin_account'; end if;
  if scheduled>now() then raise exception 'deletion_grace_period_not_elapsed'; end if;
  select email into target_email from auth.users where id=target;
  update auth.users set banned_until='9999-12-31 23:59:59+00'::timestamptz,updated_at=now() where id=target;
  delete from auth.refresh_tokens where user_id=target::text;
  delete from auth.sessions where user_id=target;
  update public.profiles set display_name='Usuario eliminado',bio='',district=null,occupation=null,verification_badge=false,identity_verification_badge=false,profile_completion=0,status='deleted',last_active_at=null,updated_at=now() where id=target;
  update public.user_private set birth_date=date '1900-01-01',legal_name=null,phone_e164=null,whatsapp_e164=null,whatsapp_public=false,phone_verified_at=null,age_verified_at=null,deletion_requested_at=coalesce(deletion_requested_at,now()),deleted_at=now(),updated_at=now() where user_id=target;
  delete from public.user_location_private where user_id=target;
  delete from public.account_usernames where user_id=target;
  update public.profile_photos set status='rejected',review_reason='account_deleted',reviewed_by=a,reviewed_at=now(),updated_at=now() where user_id=target;
  update public.blog_posts set status='archived',visibility='private',updated_at=now() where author_id=target;
  update public.stories set status='removed',visibility='private',updated_at=now() where author_id=target;
  update public.account_deletion_jobs set status='completed',completed_at=now(),completed_by=a,metadata=metadata||jsonb_build_object('auth_disabled',true,'email_hash',encode(digest(coalesce(target_email,''),'sha256'),'hex')) where id=p_job;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(a,'account_deletion_completed','user',target::text,left(nullif(trim(coalesce(p_reason,'')),''),500),jsonb_build_object('job_id',p_job),jsonb_build_object('status','deleted','auth_disabled',true));
  return jsonb_build_object('ok',true,'job_id',p_job,'user_id',target,'auth_disabled',true,'status','deleted');
end;$$;

create or replace function public.admin_grant_role(p_user uuid,p_role text,p_expires_at timestamptz default null,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='public','pg_temp' as $$
declare a uuid:=auth.uid();
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_user is null or not exists(select 1 from public.profiles where id=p_user) then raise exception 'user_not_found'; end if;
  if p_role not in ('trust_safety','support','finance','analyst','growth','content','seo') then raise exception 'role_not_delegable'; end if;
  if p_expires_at is null then raise exception 'temporary_role_requires_expiry'; end if;
  if p_expires_at<=now() or p_expires_at>now()+interval '180 days' then raise exception 'invalid_expiry'; end if;
  insert into public.admin_user_roles(user_id,role_id,granted_by,granted_at,expires_at,grant_reason)
  values(p_user,p_role,a,now(),p_expires_at,left(nullif(trim(coalesce(p_reason,'')),''),500))
  on conflict(user_id,role_id) do update set granted_by=excluded.granted_by,granted_at=now(),expires_at=excluded.expires_at,grant_reason=excluded.grant_reason;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,after_summary)
  values(a,'admin_role_granted','user',p_user::text,left(p_reason,500),jsonb_build_object('role',p_role,'expires_at',p_expires_at));
  return jsonb_build_object('ok',true,'user_id',p_user,'role',p_role,'expires_at',p_expires_at);
end;$$;

revoke all on function public.admin_get_operation_settings() from public,anon;
revoke all on function public.admin_set_operation_setting(text,jsonb,text) from public,anon;
revoke all on function public.admin_get_dashboard_v2() from public,anon;
revoke all on function public.admin_get_users_v2(text,integer,text,integer,text) from public,anon;
revoke all on function public.admin_get_deletion_jobs(integer) from public,anon;
revoke all on function public.admin_request_account_deletion(uuid,text,text) from public,anon;
revoke all on function public.admin_cancel_account_deletion(uuid,text) from public,anon;
revoke all on function public.admin_finalize_account_deletion(uuid,text,text) from public,anon;
revoke all on function public.admin_change_account_status(uuid,public.account_status,text) from public,anon;
revoke all on function public.admin_grant_role(uuid,text,timestamptz,text) from public,anon;
grant execute on function public.admin_get_operation_settings() to authenticated;
grant execute on function public.admin_set_operation_setting(text,jsonb,text) to authenticated;
grant execute on function public.admin_get_dashboard_v2() to authenticated;
grant execute on function public.admin_get_users_v2(text,integer,text,integer,text) to authenticated;
grant execute on function public.admin_get_deletion_jobs(integer) to authenticated;
grant execute on function public.admin_request_account_deletion(uuid,text,text) to authenticated;
grant execute on function public.admin_cancel_account_deletion(uuid,text) to authenticated;
grant execute on function public.admin_finalize_account_deletion(uuid,text,text) to authenticated;
grant execute on function public.admin_change_account_status(uuid,public.account_status,text) to authenticated;
grant execute on function public.admin_grant_role(uuid,text,timestamptz,text) to authenticated;