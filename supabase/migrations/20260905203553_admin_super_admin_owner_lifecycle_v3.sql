alter table public.admin_user_roles
  add column if not exists grant_scope text not null default 'delegated';

update public.admin_user_roles
set grant_scope=case
  when role_id='super_admin' and expires_at is null then 'owner'
  when role_id='super_admin' and expires_at is not null then 'temporary_ops'
  else 'delegated'
end;

update public.admin_user_roles
set grant_scope='qa'
where role_id='super_admin'
  and grant_reason ~* '(^|[^[:alnum:]_])(qa|test|testing|validation|prueba|pruebas|validaci[oó]n)([^[:alnum:]_]|$)';

alter table public.admin_user_roles
  drop constraint if exists admin_user_roles_grant_scope_check;
alter table public.admin_user_roles
  add constraint admin_user_roles_grant_scope_check
  check (grant_scope in ('owner','qa','temporary_ops','delegated'));

create or replace function public.guard_last_permanent_super_admin_owner()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_removes_owner boolean:=false;
  v_other_owners integer;
begin
  if old.role_id='super_admin' and old.grant_scope='owner' and old.expires_at is null then
    if tg_op='DELETE' then
      v_removes_owner:=true;
    elsif tg_op='UPDATE' then
      v_removes_owner:=not (
        new.role_id='super_admin'
        and new.grant_scope='owner'
        and new.expires_at is null
      );
    end if;
  end if;

  if v_removes_owner then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('citafuego_permanent_owner_lifecycle',0));
    select count(*)::int into v_other_owners
    from public.admin_user_roles
    where role_id='super_admin'
      and grant_scope='owner'
      and expires_at is null
      and user_id<>old.user_id;
    if v_other_owners<1 then
      raise exception 'last_permanent_owner_protected' using errcode='42501';
    end if;
  end if;

  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;

revoke all on function public.guard_last_permanent_super_admin_owner() from public,anon,authenticated;

drop trigger if exists admin_user_roles_last_owner_guard on public.admin_user_roles;
create trigger admin_user_roles_last_owner_guard
before delete or update of role_id,grant_scope,expires_at on public.admin_user_roles
for each row execute function public.guard_last_permanent_super_admin_owner();

create or replace function public.admin_promote_super_admin(p_user uuid,p_confirmation text,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $function$
declare
  a uuid:=auth.uid();
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('citafuego_permanent_owner_lifecycle',0));
  if a is null or not exists(
    select 1 from public.admin_user_roles
    where user_id=a and role_id='super_admin' and grant_scope='owner' and expires_at is null
  ) then
    raise exception 'permanent_owner_required' using errcode='42501';
  end if;
  if p_confirmation<>'PROMOTE' then raise exception 'confirmation_required'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required'; end if;
  if p_reason ~* '(^|[^[:alnum:]_])(qa|test|testing|validation|prueba|pruebas|validaci[oó]n)([^[:alnum:]_]|$)' then
    raise exception 'temporary_purpose_cannot_be_permanent' using errcode='42501';
  end if;
  if not exists(select 1 from auth.users where id=p_user) then raise exception 'auth_user_not_found'; end if;

  insert into public.admin_user_roles(user_id,role_id,granted_by,granted_at,expires_at,grant_reason,grant_scope)
  values(p_user,'super_admin',a,now(),null,left(trim(p_reason),500),'owner')
  on conflict(user_id,role_id) do update
    set granted_by=excluded.granted_by,
        granted_at=now(),
        expires_at=null,
        grant_reason=excluded.grant_reason,
        grant_scope='owner';

  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,after_summary)
  values(a,'super_admin_promoted','user',p_user::text,left(trim(p_reason),500),jsonb_build_object('role','super_admin','grant_scope','owner','expires_at',null));
  return jsonb_build_object('ok',true,'user_id',p_user,'role','super_admin','grant_scope','owner','expires_at',null);
end;
$function$;

revoke all on function public.admin_promote_super_admin(uuid,text,text) from public,anon;
grant execute on function public.admin_promote_super_admin(uuid,text,text) to authenticated;

create or replace function public.admin_revoke_super_admin(p_user uuid,p_confirmation text,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $function$
declare
  a uuid:=auth.uid();
  v_before jsonb;
  v_permanent_owners integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('citafuego_permanent_owner_lifecycle',0));
  if a is null or not exists(
    select 1 from public.admin_user_roles
    where user_id=a and role_id='super_admin' and grant_scope='owner' and expires_at is null
  ) then
    raise exception 'permanent_owner_required' using errcode='42501';
  end if;
  if p_confirmation<>'REVOKE SUPER ADMIN' then raise exception 'confirmation_required'; end if;
  if p_user=a then raise exception 'cannot_revoke_self' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required'; end if;

  select jsonb_build_object('role',role_id,'grant_scope',grant_scope,'granted_at',granted_at,'expires_at',expires_at,'grant_reason',grant_reason)
    into v_before
  from public.admin_user_roles
  where user_id=p_user and role_id='super_admin' and (expires_at is null or expires_at>now());
  if v_before is null then raise exception 'target_not_active_super_admin'; end if;

  select count(*)::int into v_permanent_owners
  from public.admin_user_roles
  where role_id='super_admin' and grant_scope='owner' and expires_at is null and user_id<>p_user;
  if v_permanent_owners<1 then raise exception 'last_permanent_owner_protected' using errcode='42501'; end if;

  delete from public.admin_user_roles where user_id=p_user and role_id='super_admin';

  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(a,'super_admin_role_revoked','admin_role_assignment',p_user::text,left(trim(p_reason),500),v_before,jsonb_build_object('role','super_admin','removed',true));

  return jsonb_build_object('ok',true,'user_id',p_user,'role','super_admin','removed',true);
end;
$function$;

revoke all on function public.admin_revoke_super_admin(uuid,text,text) from public,anon;
grant execute on function public.admin_revoke_super_admin(uuid,text,text) to authenticated;

create or replace function public.admin_disable_admin_account(p_user uuid,p_confirmation text,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $function$
declare
  a uuid:=auth.uid();
  roles_before jsonb;
  v_target_super boolean;
  v_target_owner boolean;
begin
  if not public.admin_has_any_role(array['super_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_confirmation<>'DISABLE ADMIN' then raise exception 'confirmation_required'; end if;
  if p_user=a then raise exception 'cannot_disable_self'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required'; end if;
  if not exists(select 1 from public.admin_user_roles where user_id=p_user and (expires_at is null or expires_at>now())) then raise exception 'target_not_active_admin'; end if;

  select exists(select 1 from public.admin_user_roles where user_id=p_user and role_id='super_admin' and (expires_at is null or expires_at>now())),
         exists(select 1 from public.admin_user_roles where user_id=p_user and role_id='super_admin' and grant_scope='owner' and expires_at is null)
    into v_target_super,v_target_owner;

  if v_target_super then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('citafuego_permanent_owner_lifecycle',0));
    if not exists(select 1 from public.admin_user_roles where user_id=a and role_id='super_admin' and grant_scope='owner' and expires_at is null) then
      raise exception 'permanent_owner_required' using errcode='42501';
    end if;
    if v_target_owner and not exists(
      select 1 from public.admin_user_roles
      where role_id='super_admin' and grant_scope='owner' and expires_at is null and user_id<>p_user
    ) then
      raise exception 'last_permanent_owner_protected' using errcode='42501';
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('role',role_id,'grant_scope',grant_scope,'expires_at',expires_at)),'[]'::jsonb)
    into roles_before from public.admin_user_roles where user_id=p_user;
  delete from public.admin_user_roles where user_id=p_user;
  update auth.users set banned_until='9999-12-31 23:59:59+00'::timestamptz,updated_at=now() where id=p_user;
  delete from auth.refresh_tokens where user_id=p_user::text;
  delete from auth.sessions where user_id=p_user;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(a,'admin_account_disabled','admin_user',p_user::text,left(trim(p_reason),500),jsonb_build_object('roles',roles_before),jsonb_build_object('roles_removed',true,'auth_disabled',true,'sessions_revoked',true));
  return jsonb_build_object('ok',true,'user_id',p_user,'roles_removed',true,'auth_disabled',true,'sessions_revoked',true);
end;
$function$;

revoke all on function public.admin_disable_admin_account(uuid,text,text) from public,anon;
grant execute on function public.admin_disable_admin_account(uuid,text,text) to authenticated;
