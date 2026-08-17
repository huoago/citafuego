create or replace function public.admin_release_safety_hold(p_user uuid,p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_admin uuid:=auth.uid();v_before public.account_status;
begin
  if not public.is_trust_admin(v_admin) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_user is null or p_user=v_admin then raise exception 'invalid_target'; end if;
  select status into v_before from public.profiles where id=p_user for update;
  if v_before is null then raise exception 'user not found'; end if;
  update public.sanctions set active=false where user_id=p_user and active and reason_code='automated_safety_review';
  update public.profiles set status='active',updated_at=now() where id=p_user and status in ('restricted','suspended');
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(v_admin,'safety_hold_released','user',p_user::text,left(coalesce(p_reason,''),1000),jsonb_build_object('status',v_before),jsonb_build_object('status','active'));
  return jsonb_build_object('user_id',p_user,'before',v_before,'after','active');
end;
$$;
revoke all on function public.admin_release_safety_hold(uuid,text) from public,anon;
grant execute on function public.admin_release_safety_hold(uuid,text) to authenticated;
