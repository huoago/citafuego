create or replace function public.admin_promote_super_admin(p_user uuid,p_confirmation text,p_reason text)
returns jsonb language plpgsql security definer set search_path='public','auth','pg_temp' as $$
declare a uuid:=auth.uid();
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_confirmation<>'PROMOTE' then raise exception 'confirmation_required'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required'; end if;
  if not exists(select 1 from auth.users where id=p_user) then raise exception 'auth_user_not_found'; end if;
  insert into public.admin_user_roles(user_id,role_id,granted_by,granted_at,expires_at,grant_reason)
  values(p_user,'super_admin',a,now(),null,left(trim(p_reason),500))
  on conflict(user_id,role_id) do update set granted_by=excluded.granted_by,granted_at=now(),expires_at=null,grant_reason=excluded.grant_reason;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,after_summary)
  values(a,'super_admin_promoted','user',p_user::text,left(trim(p_reason),500),jsonb_build_object('role','super_admin','expires_at',null));
  return jsonb_build_object('ok',true,'user_id',p_user,'role','super_admin','expires_at',null);
end;$$;

create or replace function public.admin_disable_admin_account(p_user uuid,p_confirmation text,p_reason text)
returns jsonb language plpgsql security definer set search_path='public','auth','pg_temp' as $$
declare a uuid:=auth.uid(); remaining_super integer; roles_before jsonb;
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_confirmation<>'DISABLE ADMIN' then raise exception 'confirmation_required'; end if;
  if p_user=a then raise exception 'cannot_disable_self'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required'; end if;
  if not exists(select 1 from public.admin_user_roles where user_id=p_user and (expires_at is null or expires_at>now())) then raise exception 'target_not_active_admin'; end if;
  select count(distinct user_id)::int into remaining_super from public.admin_user_roles where role_id='super_admin' and user_id<>p_user and (expires_at is null or expires_at>now());
  if exists(select 1 from public.admin_user_roles where user_id=p_user and role_id='super_admin' and (expires_at is null or expires_at>now())) and remaining_super<1 then raise exception 'last_super_admin_protected'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('role',role_id,'expires_at',expires_at)),'[]'::jsonb) into roles_before from public.admin_user_roles where user_id=p_user;
  delete from public.admin_user_roles where user_id=p_user;
  update auth.users set banned_until='9999-12-31 23:59:59+00'::timestamptz,updated_at=now() where id=p_user;
  delete from auth.refresh_tokens where user_id=p_user::text;
  delete from auth.sessions where user_id=p_user;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(a,'admin_account_disabled','admin_user',p_user::text,left(trim(p_reason),500),jsonb_build_object('roles',roles_before),jsonb_build_object('roles_removed',true,'auth_disabled',true,'sessions_revoked',true));
  return jsonb_build_object('ok',true,'user_id',p_user,'roles_removed',true,'auth_disabled',true,'sessions_revoked',true);
end;$$;
revoke all on function public.admin_promote_super_admin(uuid,text,text) from public,anon;
revoke all on function public.admin_disable_admin_account(uuid,text,text) from public,anon;
grant execute on function public.admin_promote_super_admin(uuid,text,text) to authenticated;
grant execute on function public.admin_disable_admin_account(uuid,text,text) to authenticated;