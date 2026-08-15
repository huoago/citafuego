-- CitaFuego V1.0 RC / 018_admin_backoffice.sql
-- Additive admin read models and audited Trust & Safety actions.

create or replace function public.admin_has_any_role(p_roles text[])
returns boolean
language sql stable security definer set search_path=public as $$
  select auth.uid() is not null and exists (
    select 1 from public.admin_user_roles aur
    where aur.user_id=auth.uid() and aur.role_id=any(p_roles)
  );
$$;
revoke all on function public.admin_has_any_role(text[]) from public,anon;
grant execute on function public.admin_has_any_role(text[]) to authenticated;

create or replace function public.admin_get_users(p_query text default null,p_limit integer default 50)
returns table(user_id uuid,display_name text,age integer,status public.account_status,verified boolean,city text,district text,created_at timestamptz,reports_received bigint,active_sanctions bigint)
language plpgsql security definer set search_path=public as $$
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety','support']) then raise exception 'forbidden'; end if;
  return query
  select p.id,p.display_name,extract(year from age(current_date,up.birth_date))::int,p.status,p.verification_badge,p.city,p.district,p.created_at,
    (select count(*) from public.reports r where r.reported_user_id=p.id),
    (select count(*) from public.sanctions s where s.user_id=p.id and s.active and (s.ends_at is null or s.ends_at>now()))
  from public.profiles p join public.user_private up on up.user_id=p.id
  where p_query is null or p_query='' or p.display_name ilike '%'||p_query||'%' or p.id::text=p_query
  order by p.created_at desc limit least(greatest(coalesce(p_limit,50),1),100);
end; $$;
revoke all on function public.admin_get_users(text,integer) from public,anon;
grant execute on function public.admin_get_users(text,integer) to authenticated;

create or replace function public.admin_get_report_queue(p_limit integer default 50)
returns table(report_id uuid,status public.report_status,priority public.case_priority,category text,description text,created_at timestamptz,reporter_id uuid,reporter_name text,reported_user_id uuid,reported_name text,conversation_id uuid,message_id uuid,message_body text)
language plpgsql security definer set search_path=public as $$
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety']) then raise exception 'forbidden'; end if;
  return query
  select r.id,r.status,r.priority,r.category,r.description,r.created_at,r.reporter_id,rp.display_name,r.reported_user_id,tp.display_name,r.conversation_id,r.message_id,
    case when r.message_id is not null then m.body else null end
  from public.reports r
  join public.profiles rp on rp.id=r.reporter_id
  join public.profiles tp on tp.id=r.reported_user_id
  left join public.messages m on m.id=r.message_id and m.conversation_id=r.conversation_id
  where r.status in ('open','triaged','investigating')
  order by r.priority asc,r.created_at asc
  limit least(greatest(coalesce(p_limit,50),1),100);
end; $$;
revoke all on function public.admin_get_report_queue(integer) from public,anon;
grant execute on function public.admin_get_report_queue(integer) to authenticated;

create or replace function public.admin_get_moderation_queue(p_limit integer default 100)
returns table(event_id uuid,user_id uuid,surface text,object_type text,object_id text,provider text,model_version text,labels jsonb,action public.moderation_action,reasons text[],human_review boolean,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety']) then raise exception 'forbidden'; end if;
  return query select m.id,m.user_id,m.surface,m.object_type,m.object_id,m.provider,m.model_version,m.labels,m.action,m.reasons,m.human_review,m.created_at
  from public.moderation_events m where m.human_review or m.action in ('hold','block') order by m.created_at desc limit least(greatest(coalesce(p_limit,100),1),200);
end; $$;
revoke all on function public.admin_get_moderation_queue(integer) from public,anon;
grant execute on function public.admin_get_moderation_queue(integer) to authenticated;

create or replace function public.admin_get_sanctions(p_limit integer default 100)
returns table(sanction_id uuid,user_id uuid,display_name text,type public.sanction_type,reason_code text,reason_note text,starts_at timestamptz,ends_at timestamptz,active boolean,created_by uuid,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety','support']) then raise exception 'forbidden'; end if;
  return query select s.id,s.user_id,p.display_name,s.type,s.reason_code,s.reason_note,s.starts_at,s.ends_at,s.active,s.created_by,s.created_at
  from public.sanctions s join public.profiles p on p.id=s.user_id order by s.created_at desc limit least(greatest(coalesce(p_limit,100),1),200);
end; $$;
revoke all on function public.admin_get_sanctions(integer) from public,anon;
grant execute on function public.admin_get_sanctions(integer) to authenticated;

create or replace function public.admin_get_audit_log(p_limit integer default 100)
returns table(audit_id uuid,admin_user_id uuid,action text,object_type text,object_id text,reason text,before_summary jsonb,after_summary jsonb,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety']) then raise exception 'forbidden'; end if;
  return query select a.id,a.admin_user_id,a.action,a.object_type,a.object_id,a.reason,a.before_summary,a.after_summary,a.created_at
  from public.admin_audit_log a order by a.created_at desc limit least(greatest(coalesce(p_limit,100),1),250);
end; $$;
revoke all on function public.admin_get_audit_log(integer) from public,anon;
grant execute on function public.admin_get_audit_log(integer) to authenticated;

create or replace function public.admin_apply_sanction(p_user uuid,p_type public.sanction_type,p_reason_code text,p_reason_note text default null,p_ends_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_admin uuid:=auth.uid(); v_id uuid; v_before public.account_status;
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety']) then raise exception 'forbidden'; end if;
  if p_user is null or p_user=v_admin or length(trim(coalesce(p_reason_code,'')))<2 then raise exception 'invalid_sanction'; end if;
  select status into v_before from public.profiles where id=p_user for update;
  if not found then raise exception 'user_not_found'; end if;
  if p_type in ('suspension','message_limit','discover_hidden') and p_ends_at is not null and p_ends_at<=now() then raise exception 'invalid_end'; end if;
  insert into public.sanctions(user_id,type,reason_code,reason_note,ends_at,created_by)
  values(p_user,p_type,trim(p_reason_code),nullif(trim(coalesce(p_reason_note,'')),''),p_ends_at,v_admin) returning id into v_id;
  if p_type='ban' then update public.profiles set status='banned' where id=p_user;
  elsif p_type='suspension' then update public.profiles set status='suspended' where id=p_user;
  elsif p_type='discover_hidden' then perform public.refresh_profile_activation_for(p_user);
  end if;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(v_admin,'sanction_apply','user',p_user::text,p_reason_code,jsonb_build_object('status',v_before),jsonb_build_object('sanction_id',v_id,'type',p_type,'ends_at',p_ends_at));
  return v_id;
end; $$;
revoke all on function public.admin_apply_sanction(uuid,public.sanction_type,text,text,timestamptz) from public,anon;
grant execute on function public.admin_apply_sanction(uuid,public.sanction_type,text,text,timestamptz) to authenticated;

create or replace function public.admin_resolve_report(p_report uuid,p_resolution text,p_dismiss boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_admin uuid:=auth.uid(); v_before public.report_status; v_user uuid;
begin
  if not public.admin_has_any_role(array['super_admin','trust_safety']) then raise exception 'forbidden'; end if;
  if length(trim(coalesce(p_resolution,'')))<3 then raise exception 'resolution_required'; end if;
  select status,reported_user_id into v_before,v_user from public.reports where id=p_report for update;
  if not found then raise exception 'report_not_found'; end if;
  update public.reports set status=case when p_dismiss then 'dismissed'::public.report_status else 'resolved'::public.report_status end,resolved_at=now() where id=p_report;
  insert into public.admin_audit_log(admin_user_id,action,object_type,object_id,reason,before_summary,after_summary)
  values(v_admin,case when p_dismiss then 'report_dismiss' else 'report_resolve' end,'report',p_report::text,p_resolution,jsonb_build_object('status',v_before),jsonb_build_object('status',case when p_dismiss then 'dismissed' else 'resolved' end,'reported_user_id',v_user));
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.admin_resolve_report(uuid,text,boolean) from public,anon;
grant execute on function public.admin_resolve_report(uuid,text,boolean) to authenticated;
