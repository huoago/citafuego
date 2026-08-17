-- CitaFuego V3: multi-provider auth completion, automated safety triage,
-- and temporary removal of subscription-gated Rewind from the core UX.

-- Email Magic Link signups remain strict. OAuth/phone identities may be created
-- in a pending state, but cannot enter the app until complete_pending_registration succeeds.
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
begin
  begin
    v_birth:=nullif(new.raw_user_meta_data->>'birth_date','')::date;
  exception when others then
    if v_provider in ('google','phone') then return new; end if;
    raise exception 'invalid_birth_date';
  end;

  v_terms:=nullif(new.raw_user_meta_data->>'terms_version','');
  v_privacy:=nullif(new.raw_user_meta_data->>'privacy_version','');
  v_sensitive:=nullif(new.raw_user_meta_data->>'sensitive_data_version','');

  if v_birth is null or v_terms is null or v_privacy is null or v_sensitive is null then
    if v_provider in ('google','phone') then return new; end if;
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

create or replace function public.complete_pending_registration(
  p_birth_date date,
  p_accept_terms boolean,
  p_accept_privacy boolean,
  p_accept_sensitive boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $$
declare
  v_user uuid:=auth.uid();
  v_terms text;
  v_privacy text;
  v_sensitive text;
  v_phone text;
  v_phone_confirmed timestamptz;
  v_provider text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not public.is_adult(p_birth_date) then raise exception 'adult_only'; end if;
  if not (coalesce(p_accept_terms,false) and coalesce(p_accept_privacy,false) and coalesce(p_accept_sensitive,false)) then
    raise exception 'legal_consent_required';
  end if;

  select current_version into v_terms from public.legal_document_versions where document_type='terms';
  select current_version into v_privacy from public.legal_document_versions where document_type='privacy';
  select current_version into v_sensitive from public.legal_document_versions where document_type='sensitive_data';
  if v_terms is null or v_privacy is null or v_sensitive is null then raise exception 'legal_versions_unavailable'; end if;

  select u.phone,u.phone_confirmed_at,coalesce(u.raw_app_meta_data->>'provider','email')
    into v_phone,v_phone_confirmed,v_provider
  from auth.users u where u.id=v_user;

  insert into public.user_private(user_id,birth_date,phone_e164,phone_verified_at)
  values(v_user,p_birth_date,v_phone,case when v_phone_confirmed is not null then now() else null end)
  on conflict(user_id) do update set
    birth_date=excluded.birth_date,
    phone_e164=coalesce(public.user_private.phone_e164,excluded.phone_e164),
    phone_verified_at=coalesce(public.user_private.phone_verified_at,excluded.phone_verified_at),
    updated_at=now();

  insert into public.dating_preferences(user_id) values(v_user) on conflict(user_id) do nothing;

  insert into public.consent_events(user_id,consent_type,document_version,granted,source,metadata)
  values(v_user,'terms',v_terms,true,'social_auth_completion',jsonb_build_object('provider',v_provider)),
        (v_user,'privacy',v_privacy,true,'social_auth_completion',jsonb_build_object('provider',v_provider)),
        (v_user,'sensitive_data',v_sensitive,true,'social_auth_completion',jsonb_build_object('provider',v_provider));

  return jsonb_build_object('completed',true,'provider',v_provider);
end;
$$;
revoke all on function public.complete_pending_registration(date,boolean,boolean,boolean) from public;
grant execute on function public.complete_pending_registration(date,boolean,boolean,boolean) to authenticated;

-- Rewind is temporarily part of the core product while subscriptions are hidden.
create or replace function public.rewind_last_pass()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid:=auth.uid();
  v_target uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select id,to_user_id into v_id,v_target
  from public.interactions
  where from_user_id=v_user and action='pass'
  order by updated_at desc
  limit 1 for update;
  if v_id is null then return jsonb_build_object('allowed',true,'rewound',false); end if;
  delete from public.interactions where id=v_id;
  return jsonb_build_object('allowed',true,'rewound',true,'profile_id',v_target);
end;
$$;
grant execute on function public.rewind_last_pass() to authenticated;

-- Automated safety review: classify and aggregate independent signals.
-- Never automatically bans a user; thresholds only place an active account into
-- restricted pending human Trust & Safety review.
create or replace function public.auto_review_user_safety(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_reporters integer:=0;
  v_severe_reporters integer:=0;
  v_blockers integer:=0;
  v_should_restrict boolean:=false;
  v_current public.account_status;
begin
  if p_user is null then return jsonb_build_object('restricted',false); end if;

  select count(distinct reporter_id) into v_reporters
  from public.reports
  where reported_user_id=p_user and created_at>=now()-interval '7 days'
    and status in ('open','triaged');

  select count(distinct reporter_id) into v_severe_reporters
  from public.reports
  where reported_user_id=p_user and created_at>=now()-interval '7 days'
    and category in ('minor_risk','threat','scam','paid_sex')
    and status in ('open','triaged');

  select count(distinct blocker_id) into v_blockers
  from public.blocks
  where blocked_id=p_user and created_at>=now()-interval '7 days';

  v_should_restrict := v_severe_reporters>=2 or v_reporters>=4 or (v_blockers>=6 and v_reporters>=1);
  select status into v_current from public.profiles where id=p_user for update;

  if v_should_restrict and v_current='active' then
    update public.profiles set status='restricted',updated_at=now() where id=p_user;
    if not exists(select 1 from public.sanctions s where s.user_id=p_user and s.active and s.reason_code='automated_safety_review') then
      insert into public.sanctions(user_id,type,reason_code,reason_note,active)
      values(p_user,'suspension','automated_safety_review','Restricción automática preventiva; requiere revisión humana.',true);
    end if;
    insert into public.moderation_events(user_id,surface,object_type,object_id,provider,policy_version,labels,action,reasons,human_review)
    values(p_user,'account','profile',p_user::text,'cita_safety_rules','2026-08-auto-v1',
      jsonb_build_object('reporters_7d',v_reporters,'severe_reporters_7d',v_severe_reporters,'blockers_7d',v_blockers),
      'hold',array['aggregated_user_reports'],true);
  end if;

  return jsonb_build_object(
    'restricted',v_should_restrict and v_current='active',
    'reporters_7d',v_reporters,
    'severe_reporters_7d',v_severe_reporters,
    'blockers_7d',v_blockers,
    'human_review_required',v_should_restrict
  );
end;
$$;
revoke all on function public.auto_review_user_safety(uuid) from public,anon,authenticated;

create or replace function public.submit_report(
  p_reported uuid,
  p_category text,
  p_description text default null,
  p_conversation uuid default null,
  p_message uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_reporter uuid:=auth.uid();
  v_report_id uuid;
  v_priority public.case_priority:='p2';
  v_weight numeric:=2;
  v_human boolean:=false;
begin
  if v_reporter is null then raise exception 'not_authenticated'; end if;
  if p_reported is null or p_reported=v_reporter then raise exception 'invalid_target'; end if;
  if p_category not in ('fake_profile','spam','harassment','sexual_content','minor_risk','scam','paid_sex','impersonation','threat','other') then
    raise exception 'invalid_category';
  end if;

  select r.id into v_report_id
  from public.reports r
  where r.reporter_id=v_reporter and r.reported_user_id=p_reported and r.category=p_category
    and r.created_at>=now()-interval '12 hours' and r.status in ('open','triaged')
  order by r.created_at desc limit 1;
  if v_report_id is not null then return v_report_id; end if;

  if p_category in ('minor_risk','threat') then v_priority:='p0';v_weight:=10;v_human:=true;
  elsif p_category in ('scam','paid_sex','impersonation','sexual_content') then v_priority:='p1';v_weight:=6;v_human:=true;
  elsif p_category in ('fake_profile','harassment') then v_priority:='p2';v_weight:=4;
  elsif p_category='spam' then v_priority:='p2';v_weight:=2;
  else v_priority:='p3';v_weight:=1;
  end if;

  insert into public.reports(reporter_id,reported_user_id,conversation_id,message_id,category,description,status,priority)
  values(v_reporter,p_reported,p_conversation,p_message,p_category,nullif(trim(coalesce(p_description,'')),''),'triaged',v_priority)
  returning id into v_report_id;

  insert into public.risk_signals(user_id,signal_type,weight,source,expires_at,metadata)
  values(p_reported,'user_report_'||p_category,v_weight,'user_report',now()+interval '90 days',
    jsonb_build_object('report_id',v_report_id,'reporter_id',v_reporter,'category',p_category));

  if v_human then
    insert into public.moderation_events(user_id,surface,object_type,object_id,provider,policy_version,labels,action,reasons,human_review)
    values(p_reported,'report','profile',p_reported::text,'cita_safety_rules','2026-08-auto-v1',
      jsonb_build_object('report_id',v_report_id,'category',p_category,'priority',v_priority::text),
      'hold',array['high_severity_user_report'],true);
  end if;

  perform public.auto_review_user_safety(p_reported);
  return v_report_id;
end;
$$;
revoke all on function public.submit_report(uuid,text,text,uuid,uuid) from public,anon;
grant execute on function public.submit_report(uuid,text,text,uuid,uuid) to authenticated;

create or replace function public.block_user(p_user uuid,p_reason text default 'user_block')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid:=auth.uid();
  v_is_new boolean:=false;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_user is null or p_user=v_user then raise exception 'invalid_target'; end if;

  if not exists(select 1 from public.blocks where blocker_id=v_user and blocked_id=p_user) then
    v_is_new:=true;
    insert into public.blocks(blocker_id,blocked_id,reason) values(v_user,p_user,nullif(p_reason,''));
    insert into public.risk_signals(user_id,signal_type,weight,source,expires_at,metadata)
    values(p_user,'user_block',1,'user_block',now()+interval '30 days',jsonb_build_object('blocker_id',v_user));
  else
    update public.blocks set reason=coalesce(nullif(p_reason,''),reason) where blocker_id=v_user and blocked_id=p_user;
  end if;

  update public.matches set status='ended',ended_at=coalesce(ended_at,now())
  where status='active' and ((user_a=v_user and user_b=p_user) or (user_a=p_user and user_b=v_user));

  update public.conversations c set status='ended'
  where c.status='active' and exists(
    select 1 from public.matches m where m.id=c.match_id
      and ((m.user_a=v_user and m.user_b=p_user) or (m.user_a=p_user and m.user_b=v_user))
  );

  perform public.auto_review_user_safety(p_user);
  return jsonb_build_object('blocked',true,'new_signal',v_is_new);
end;
$$;
revoke all on function public.block_user(uuid,text) from public,anon;
grant execute on function public.block_user(uuid,text) to authenticated;
