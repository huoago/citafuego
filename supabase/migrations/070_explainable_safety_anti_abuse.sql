-- CitaFuego V4 safety: explainable reporter credibility, anti-retaliation weighting,
-- weighted automatic restriction, and a Trust & Safety risk timeline.
-- No automatic permanent bans are introduced.

create or replace function public.reporter_safety_credibility(p_reporter uuid,p_target uuid)
returns numeric
language plpgsql
security definer
stable
set search_path to 'public'
as $$
declare
  v_created timestamptz;
  v_verified boolean:=false;
  v_identity boolean:=false;
  v_velocity integer:=0;
  v_score numeric:=1;
begin
  select created_at,coalesce(verification_badge,false),coalesce(identity_verification_badge,false)
    into v_created,v_verified,v_identity from public.profiles where id=p_reporter;
  if v_created is null then return 0.25; end if;
  if v_created>now()-interval '1 day' then v_score:=0.25;
  elsif v_created>now()-interval '7 days' then v_score:=0.50;
  elsif v_created>now()-interval '30 days' then v_score:=0.75;
  else v_score:=1.00; end if;
  if v_verified then v_score:=v_score+0.15; end if;
  if v_identity then v_score:=v_score+0.25; end if;
  v_score:=least(v_score,1.25);

  select count(*) into v_velocity from public.reports where reporter_id=p_reporter and created_at>=now()-interval '24 hours';
  if v_velocity>=8 then v_score:=v_score*0.25;
  elsif v_velocity>=5 then v_score:=v_score*0.40;
  elsif v_velocity>=3 then v_score:=v_score*0.70; end if;

  if exists(select 1 from public.reports where reporter_id=p_target and reported_user_id=p_reporter and created_at>=now()-interval '24 hours') then
    v_score:=v_score*0.50;
  end if;
  return round(greatest(v_score,0.10),2);
end;
$$;
revoke all on function public.reporter_safety_credibility(uuid,uuid) from public,anon,authenticated;

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
  v_report_score numeric:=0;
  v_severe_score numeric:=0;
  v_should_restrict boolean:=false;
  v_current public.account_status;
begin
  if p_user is null then return jsonb_build_object('restricted',false); end if;

  with per_reporter as (
    select r.reporter_id,
      public.reporter_safety_credibility(r.reporter_id,p_user) credibility,
      bool_or(r.category in ('minor_risk','threat','scam','paid_sex')) severe
    from public.reports r
    where r.reported_user_id=p_user and r.created_at>=now()-interval '7 days' and r.status in ('open','triaged','investigating')
    group by r.reporter_id
  )
  select count(*),count(*) filter(where severe),coalesce(sum(credibility),0),coalesce(sum(credibility) filter(where severe),0)
    into v_reporters,v_severe_reporters,v_report_score,v_severe_score from per_reporter;

  select count(distinct blocker_id) into v_blockers from public.blocks where blocked_id=p_user and created_at>=now()-interval '7 days';

  v_should_restrict :=
    (v_severe_reporters>=2 and v_severe_score>=1.50)
    or (v_reporters>=3 and v_report_score>=2.50)
    or (v_blockers>=6 and v_reporters>=2 and v_report_score>=1.50);

  select status into v_current from public.profiles where id=p_user for update;
  if v_should_restrict and v_current='active' then
    update public.profiles set status='restricted',updated_at=now() where id=p_user;
    if not exists(select 1 from public.sanctions s where s.user_id=p_user and s.active and s.reason_code='automated_safety_review') then
      insert into public.sanctions(user_id,type,reason_code,reason_note,active)
      values(p_user,'suspension','automated_safety_review','Restricción preventiva por señales independientes ponderadas; requiere revisión humana.',true);
    end if;
    insert into public.moderation_events(user_id,surface,object_type,object_id,provider,policy_version,labels,action,reasons,human_review)
    values(p_user,'account','profile',p_user::text,'cita_safety_rules','2026-08-auto-v2',
      jsonb_build_object('reporters_7d',v_reporters,'severe_reporters_7d',v_severe_reporters,'weighted_reports_7d',v_report_score,'weighted_severe_7d',v_severe_score,'blockers_7d',v_blockers),
      'hold',array['weighted_independent_safety_signals'],true);
  end if;

  return jsonb_build_object('restricted',v_should_restrict and v_current='active','reporters_7d',v_reporters,'severe_reporters_7d',v_severe_reporters,'weighted_reports_7d',v_report_score,'weighted_severe_7d',v_severe_score,'blockers_7d',v_blockers,'human_review_required',v_should_restrict,'policy','2026-08-auto-v2');
end;
$$;
revoke all on function public.auto_review_user_safety(uuid) from public,anon,authenticated;

create or replace function public.admin_get_user_risk_timeline(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_profile jsonb;
  v_metrics jsonb;
  v_reports jsonb;
  v_events jsonb;
  v_sanctions jsonb;
  v_shared_devices integer:=0;
begin
  if not public.is_trust_admin(auth.uid()) then raise exception 'forbidden' using errcode='42501'; end if;

  select jsonb_build_object('id',p.id,'display_name',p.display_name,'status',p.status,'created_at',p.created_at,'verification_badge',p.verification_badge,'identity_verification_badge',p.identity_verification_badge)
    into v_profile from public.profiles p where p.id=p_user;
  if v_profile is null then raise exception 'user not found'; end if;

  with per_reporter as (
    select r.reporter_id,public.reporter_safety_credibility(r.reporter_id,p_user) credibility,bool_or(r.category in ('minor_risk','threat','scam','paid_sex')) severe
    from public.reports r where r.reported_user_id=p_user and r.created_at>=now()-interval '7 days' and r.status in ('open','triaged','investigating') group by r.reporter_id
  )
  select jsonb_build_object(
    'reporters_7d',count(*),'severe_reporters_7d',count(*) filter(where severe),
    'weighted_reports_7d',coalesce(sum(credibility),0),'weighted_severe_7d',coalesce(sum(credibility) filter(where severe),0),
    'blockers_7d',(select count(distinct blocker_id) from public.blocks where blocked_id=p_user and created_at>=now()-interval '7 days'),
    'policy','2026-08-auto-v2') into v_metrics from per_reporter;

  select count(distinct other.user_id) into v_shared_devices
  from public.user_devices mine join public.user_devices other on other.device_fingerprint_hash=mine.device_fingerprint_hash and other.user_id<>mine.user_id
  where mine.user_id=p_user;
  v_metrics:=v_metrics||jsonb_build_object('shared_device_accounts',v_shared_devices);

  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'at',r.created_at,'category',r.category,'priority',r.priority,'status',r.status,'reporter_id',r.reporter_id,'credibility',public.reporter_safety_credibility(r.reporter_id,p_user),'reciprocal_24h',exists(select 1 from public.reports rr where rr.reporter_id=p_user and rr.reported_user_id=r.reporter_id and rr.created_at>=r.created_at-interval '24 hours' and rr.created_at<=r.created_at+interval '24 hours')) order by r.created_at desc),'[]'::jsonb)
    into v_reports from public.reports r where r.reported_user_id=p_user and r.created_at>=now()-interval '90 days';
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'at',m.created_at,'action',m.action,'human_review',m.human_review,'labels',m.labels) order by m.created_at desc),'[]'::jsonb)
    into v_events from public.moderation_events m where m.user_id=p_user;
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'at',s.created_at,'type',s.type,'reason_code',s.reason_code,'reason_note',s.reason_note,'ends_at',s.ends_at,'active',s.active) order by s.created_at desc),'[]'::jsonb)
    into v_sanctions from public.sanctions s where s.user_id=p_user;

  return jsonb_build_object('profile',v_profile,'metrics',v_metrics,'reports',v_reports,'moderation_events',v_events,'sanctions',v_sanctions);
end;
$$;
revoke all on function public.admin_get_user_risk_timeline(uuid) from public,anon;
grant execute on function public.admin_get_user_risk_timeline(uuid) to authenticated;
