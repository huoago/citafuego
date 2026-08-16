-- CitaFuego growth + random matching foundation.
-- Additive production migration after historical migration 031.

create table if not exists public.profile_prompts (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  prompt_key text not null check (prompt_key in ('plan_ideal','me_gana','domingo','viaje','obsesion','primera_cita')),
  answer text not null check (char_length(answer) between 3 and 280),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);
alter table public.profile_prompts enable row level security;
drop policy if exists profile_prompts_self_read on public.profile_prompts;
create policy profile_prompts_self_read on public.profile_prompts for select to authenticated using (user_id=auth.uid());

grant select on public.profile_prompts to authenticated;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('like','match','message','boost','random','system')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body)<=400),
  href text check (href is null or char_length(href)<=240),
  actor_user_id uuid references auth.users(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_user_created_idx on public.user_notifications(user_id, created_at desc);
create index if not exists user_notifications_unread_idx on public.user_notifications(user_id, created_at desc) where read_at is null;
alter table public.user_notifications enable row level security;
drop policy if exists notifications_self_read on public.user_notifications;
create policy notifications_self_read on public.user_notifications for select to authenticated using (user_id=auth.uid());
drop policy if exists notifications_self_update on public.user_notifications;
create policy notifications_self_update on public.user_notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
grant select,update on public.user_notifications to authenticated;

create table if not exists public.random_match_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null check (mode in ('text','voice','video')),
  joined_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '5 minutes')
);
alter table public.random_match_queue enable row level security;
drop policy if exists random_queue_self_read on public.random_match_queue;
create policy random_queue_self_read on public.random_match_queue for select to authenticated using (user_id=auth.uid());
grant select on public.random_match_queue to authenticated;

create table if not exists public.random_match_sessions (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('text','voice','video')),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references auth.users(id) on delete set null,
  check (user_a<>user_b)
);
create index if not exists random_sessions_user_a_idx on public.random_match_sessions(user_a,started_at desc);
create index if not exists random_sessions_user_b_idx on public.random_match_sessions(user_b,started_at desc);
alter table public.random_match_sessions enable row level security;
drop policy if exists random_sessions_participant_read on public.random_match_sessions;
create policy random_sessions_participant_read on public.random_match_sessions for select to authenticated using (auth.uid() in (user_a,user_b));
grant select on public.random_match_sessions to authenticated;

create table if not exists public.random_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.random_match_sessions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'sent' check (status in ('sent','held','removed')),
  client_message_id text not null check (char_length(client_message_id) between 6 and 100),
  created_at timestamptz not null default now(),
  unique(session_id,sender_id,client_message_id)
);
create index if not exists random_messages_session_created_idx on public.random_chat_messages(session_id,created_at);
alter table public.random_chat_messages enable row level security;
drop policy if exists random_messages_participant_read on public.random_chat_messages;
create policy random_messages_participant_read on public.random_chat_messages for select to authenticated using (
  exists(select 1 from public.random_match_sessions s where s.id=session_id and auth.uid() in (s.user_a,s.user_b))
  and (status='sent' or sender_id=auth.uid())
);
grant select on public.random_chat_messages to authenticated;

create table if not exists public.random_signals (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.random_match_sessions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  signal_type text not null check (signal_type in ('offer','answer','ice','hangup')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists random_signals_session_id_idx on public.random_signals(session_id,id);
alter table public.random_signals enable row level security;
drop policy if exists random_signals_participant_read on public.random_signals;
create policy random_signals_participant_read on public.random_signals for select to authenticated using (
  exists(select 1 from public.random_match_sessions s where s.id=session_id and auth.uid() in (s.user_a,s.user_b))
);
drop policy if exists random_signals_participant_insert on public.random_signals;
create policy random_signals_participant_insert on public.random_signals for insert to authenticated with check (
  sender_id=auth.uid() and exists(select 1 from public.random_match_sessions s where s.id=session_id and s.status='active' and auth.uid() in (s.user_a,s.user_b))
);
grant select,insert on public.random_signals to authenticated;
grant usage,select on sequence public.random_signals_id_seq to authenticated;

create or replace function public.touch_presence() returns timestamptz
language plpgsql security definer set search_path=public as $$
declare v_now timestamptz:=now();
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.profiles set last_active_at=v_now where id=auth.uid() and status='active';
  return v_now;
end; $$;
revoke all on function public.touch_presence() from public,anon;
grant execute on function public.touch_presence() to authenticated;

create or replace function public.save_profile_prompt(p_slot smallint,p_prompt_key text,p_answer text) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_slot<1 or p_slot>3 then raise exception 'invalid_slot'; end if;
  if p_prompt_key not in ('plan_ideal','me_gana','domingo','viaje','obsesion','primera_cita') then raise exception 'invalid_prompt'; end if;
  if char_length(trim(p_answer))<3 or char_length(trim(p_answer))>280 then raise exception 'invalid_answer'; end if;
  insert into public.profile_prompts(user_id,slot,prompt_key,answer)
  values(auth.uid(),p_slot,p_prompt_key,trim(p_answer))
  on conflict(user_id,slot) do update set prompt_key=excluded.prompt_key,answer=excluded.answer,updated_at=now();
  return jsonb_build_object('ok',true,'slot',p_slot);
end; $$;
revoke all on function public.save_profile_prompt(smallint,text,text) from public,anon;
grant execute on function public.save_profile_prompt(smallint,text,text) to authenticated;

create or replace function public.delete_profile_prompt(p_slot smallint) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from public.profile_prompts where user_id=auth.uid() and slot=p_slot;
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.delete_profile_prompt(smallint) from public,anon;
grant execute on function public.delete_profile_prompt(smallint) to authenticated;

create or replace function public.set_primary_profile_photo(p_photo uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.profile_photos where id=p_photo and user_id=auth.uid() and status='approved') then raise exception 'photo_unavailable'; end if;
  update public.profile_photos set is_primary=false,updated_at=now() where user_id=auth.uid();
  update public.profile_photos set is_primary=true,updated_at=now() where id=p_photo and user_id=auth.uid();
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.set_primary_profile_photo(uuid) from public,anon;
grant execute on function public.set_primary_profile_photo(uuid) to authenticated;

create or replace function public.reorder_profile_photos(p_photo_ids uuid[]) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  v_count:=coalesce(array_length(p_photo_ids,1),0);
  if v_count<1 or v_count>9 then raise exception 'invalid_order'; end if;
  if (select count(*) from public.profile_photos where user_id=auth.uid() and id=any(p_photo_ids) and status<>'removed')<>v_count then raise exception 'invalid_photo'; end if;
  update public.profile_photos p set position=(x.ord-1)::smallint,updated_at=now()
  from unnest(p_photo_ids) with ordinality as x(id,ord)
  where p.id=x.id and p.user_id=auth.uid();
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.reorder_profile_photos(uuid[]) from public,anon;
grant execute on function public.reorder_profile_photos(uuid[]) to authenticated;

create or replace function public.activate_profile_boost() returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_user uuid:=auth.uid(); v_sub record; v_included integer:=0; v_used integer:=0; v_balance integer:=0; v_id uuid; v_ends timestamptz;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.profiles where id=v_user and status='active') then raise exception 'profile_not_active'; end if;
  if exists(select 1 from public.boost_activations where user_id=v_user and ends_at>now()) then raise exception 'boost_already_active'; end if;

  select s.product_id,s.current_period_start,coalesce((cp.entitlements->>'boosts_per_period')::int,0) included
  into v_sub from public.subscriptions s join public.catalog_products cp on cp.id=s.product_id
  where s.user_id=v_user and s.status in ('trialing','active') and (s.current_period_end is null or s.current_period_end>now())
  order by s.created_at desc limit 1;
  v_included:=coalesce(v_sub.included,0);
  if v_included>0 then
    select count(*) into v_used from public.boost_activations
    where user_id=v_user and started_at>=coalesce(v_sub.current_period_start,date_trunc('month',now())) and source='subscription';
  end if;

  if v_included>v_used then
    insert into public.boost_activations(user_id,started_at,ends_at,source) values(v_user,now(),now()+interval '30 minutes','subscription') returning id,ends_at into v_id,v_ends;
  else
    select coalesce(sum(delta),0)::int into v_balance from public.entitlement_ledger
    where user_id=v_user and entitlement='boost_credits' and (expires_at is null or expires_at>now());
    if v_balance<1 then raise exception 'boost_required'; end if;
    insert into public.entitlement_ledger(user_id,entitlement,delta,source_type,source_id) values(v_user,'boost_credits',-1,'boost','activation');
    insert into public.boost_activations(user_id,started_at,ends_at,source) values(v_user,now(),now()+interval '30 minutes','credit') returning id,ends_at into v_id,v_ends;
  end if;
  insert into public.user_notifications(user_id,kind,title,body,href) values(v_user,'boost','Boost activado','Tu perfil tendrá prioridad durante 30 minutos.','/descubrir');
  return jsonb_build_object('ok',true,'boostId',v_id,'endsAt',v_ends);
end; $$;
revoke all on function public.activate_profile_boost() from public,anon;
grant execute on function public.activate_profile_boost() to authenticated;

create or replace function public.get_my_boost_status() returns jsonb
language sql stable security definer set search_path=public as $$
  select coalesce((select jsonb_build_object('active',true,'endsAt',b.ends_at,'source',b.source) from public.boost_activations b where b.user_id=auth.uid() and b.ends_at>now() order by b.ends_at desc limit 1),jsonb_build_object('active',false));
$$;
revoke all on function public.get_my_boost_status() from public,anon;
grant execute on function public.get_my_boost_status() to authenticated;

-- Discovery V3 preserves reciprocal eligibility from get_discover_candidates and adds
-- online/boost signals, prompts and lightweight learning from recent behavior.
create or replace function public.get_discover_page_v3(p_offset integer default 0,p_limit integer default 12)
returns table(
  profile_id uuid,display_name text,age integer,district text,distance_bucket text,bio text,intent public.relationship_intent,verified boolean,
  primary_photo_path text,interests text[],shared_interest_count integer,chemistry_score integer,is_online boolean,is_boosted boolean,prompts jsonb,learning_reason text
)
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_filter public.premium_discovery_filters%rowtype; v_has_plus boolean:=false;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.profiles where id=v_user and status='active') then raise exception 'profile_not_active'; end if;
  v_has_plus:=public.has_premium_tier('plus');
  if v_has_plus then select * into v_filter from public.premium_discovery_filters where user_id=v_user; end if;
  return query
  with base as (
    select d.*,p.last_active_at,
      exists(select 1 from public.boost_activations b where b.user_id=d.profile_id and b.ends_at>now()) boosted,
      coalesce((select jsonb_agg(jsonb_build_object('key',pp.prompt_key,'answer',pp.answer) order by pp.slot) from public.profile_prompts pp where pp.user_id=d.profile_id),'[]'::jsonb) prompt_json,
      coalesce((select count(*) from public.analytics_events ae where ae.user_id=v_user and ae.event_name='profile_impression' and ae.occurred_at>now()-interval '7 days' and ae.properties->>'targetUserId'=d.profile_id::text),0)::int recent_impressions,
      coalesce((select count(distinct pi.interest_id) from public.profile_interests pi where pi.user_id=d.profile_id and pi.interest_id in (
        select distinct liked_pi.interest_id from public.interactions ix join public.profile_interests liked_pi on liked_pi.user_id=ix.to_user_id
        where ix.from_user_id=v_user and ix.action in ('like','superfuego') and ix.updated_at>now()-interval '90 days'
      )),0)::int affinity
    from public.get_discover_candidates(50) d join public.profiles p on p.id=d.profile_id
  ), scored as (
    select base.*,
      (base.last_active_at>=now()-interval '5 minutes') online,
      least(99,greatest(40,base.chemistry_score
        +case when base.last_active_at>=now()-interval '5 minutes' then 5 else 0 end
        +case when base.boosted then 10 else 0 end
        +least(base.affinity*2,8)
        -least(base.recent_impressions*2,10)
        +(abs(hashtextextended(base.profile_id::text||current_date::text,0))%4)::int
      ))::int learned_score
    from base
  )
  select s.profile_id,s.display_name,s.age,s.district,s.distance_bucket,s.bio,s.intent,s.verified,s.primary_photo_path,s.interests,s.shared_interest_count,
    s.learned_score,s.online,s.boosted,s.prompt_json,
    case when s.boosted then 'Perfil destacado' when s.online then 'Activo ahora' when s.affinity>0 then 'Afinidad con tus Likes recientes' when s.shared_interest_count>0 then 'Intereses en común' else 'Compatible con tus preferencias' end
  from scored s
  where (not v_has_plus or v_filter.user_id is null or ((not v_filter.verified_only or s.verified) and s.shared_interest_count>=v_filter.min_shared_interests and (v_filter.recently_active_hours is null or s.last_active_at>=now()-make_interval(hours=>v_filter.recently_active_hours))))
  order by s.learned_score desc,s.boosted desc,s.online desc,s.verified desc
  offset greatest(coalesce(p_offset,0),0)
  limit least(greatest(coalesce(p_limit,12),1),25);
end; $$;
revoke all on function public.get_discover_page_v3(integer,integer) from public,anon;
grant execute on function public.get_discover_page_v3(integer,integer) to authenticated;

create or replace function public.join_random_match(p_mode text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_peer uuid; v_session uuid; v_peer_name text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_mode not in ('text','voice','video') then raise exception 'invalid_mode'; end if;
  if not exists(select 1 from public.profiles where id=v_user and status='active' and verification_badge=true) then raise exception 'verified_profile_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('random:'||p_mode,0));
  delete from public.random_match_queue where expires_at<=now();

  select s.id into v_session from public.random_match_sessions s where s.status='active' and v_user in (s.user_a,s.user_b) order by s.started_at desc limit 1;
  if v_session is not null then
    return (select jsonb_build_object('status','matched','sessionId',s.id,'mode',s.mode) from public.random_match_sessions s where s.id=v_session);
  end if;

  select q.user_id into v_peer
  from public.random_match_queue q
  join public.profiles peer on peer.id=q.user_id and peer.status='active' and peer.verification_badge=true
  join public.profiles me on me.id=v_user
  where q.mode=p_mode and q.user_id<>v_user and q.expires_at>now() and peer.city=me.city and peer.country_code=me.country_code
    and not exists(select 1 from public.blocks b where (b.blocker_id=v_user and b.blocked_id=q.user_id) or (b.blocker_id=q.user_id and b.blocked_id=v_user))
  order by q.joined_at asc limit 1 for update of q skip locked;

  if v_peer is null then
    insert into public.random_match_queue(user_id,mode,joined_at,expires_at) values(v_user,p_mode,now(),now()+interval '5 minutes')
    on conflict(user_id) do update set mode=excluded.mode,joined_at=case when public.random_match_queue.mode=excluded.mode then public.random_match_queue.joined_at else now() end,expires_at=now()+interval '5 minutes';
    return jsonb_build_object('status','waiting','mode',p_mode);
  end if;

  delete from public.random_match_queue where user_id in (v_user,v_peer);
  if v_user::text<v_peer::text then
    insert into public.random_match_sessions(mode,user_a,user_b) values(p_mode,v_user,v_peer) returning id into v_session;
  else
    insert into public.random_match_sessions(mode,user_a,user_b) values(p_mode,v_peer,v_user) returning id into v_session;
  end if;
  select display_name into v_peer_name from public.profiles where id=v_peer;
  insert into public.user_notifications(user_id,kind,title,body,href,actor_user_id)
  values(v_user,'random','Conexión aleatoria encontrada','Ya puedes iniciar la conversación.','/azar/'||v_session::text,v_peer),
        (v_peer,'random','Conexión aleatoria encontrada','Ya puedes iniciar la conversación.','/azar/'||v_session::text,v_user);
  return jsonb_build_object('status','matched','sessionId',v_session,'mode',p_mode,'peerName',v_peer_name);
end; $$;
revoke all on function public.join_random_match(text) from public,anon;
grant execute on function public.join_random_match(text) to authenticated;

create or replace function public.get_random_session(p_session uuid)
returns table(session_id uuid,mode text,status text,peer_id uuid,peer_name text,peer_verified boolean,is_caller boolean,started_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return query select s.id,s.mode,s.status,
    case when s.user_a=auth.uid() then s.user_b else s.user_a end,
    p.display_name,p.verification_badge,(s.user_a=auth.uid()),s.started_at
  from public.random_match_sessions s
  join public.profiles p on p.id=case when s.user_a=auth.uid() then s.user_b else s.user_a end
  where s.id=p_session and auth.uid() in (s.user_a,s.user_b);
end; $$;
revoke all on function public.get_random_session(uuid) from public,anon;
grant execute on function public.get_random_session(uuid) to authenticated;

create or replace function public.leave_random_match(p_session uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.random_match_sessions set status='ended',ended_at=coalesce(ended_at,now()),ended_by=coalesce(ended_by,auth.uid()) where id=p_session and status='active' and auth.uid() in (user_a,user_b);
  if not found then raise exception 'session_unavailable'; end if;
  insert into public.random_signals(session_id,sender_id,signal_type,payload) values(p_session,auth.uid(),'hangup','{}'::jsonb);
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.leave_random_match(uuid) from public,anon;
grant execute on function public.leave_random_match(uuid) to authenticated;

create or replace function public.submit_random_message(p_session uuid,p_client_message_id text,p_text text,p_status text default 'sent') returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_status text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_status not in ('sent','held') then raise exception 'invalid_status'; end if;
  if char_length(trim(p_text))<1 or char_length(trim(p_text))>2000 then raise exception 'invalid_message'; end if;
  if not exists(select 1 from public.random_match_sessions s where s.id=p_session and s.status='active' and auth.uid() in (s.user_a,s.user_b)) then raise exception 'session_unavailable'; end if;
  insert into public.random_chat_messages(session_id,sender_id,body,status,client_message_id)
  values(p_session,auth.uid(),trim(p_text),p_status,p_client_message_id)
  on conflict(session_id,sender_id,client_message_id) do update set client_message_id=excluded.client_message_id
  returning id,status into v_id,v_status;
  return jsonb_build_object('id',v_id,'status',v_status);
end; $$;
revoke all on function public.submit_random_message(uuid,text,text,text) from public,anon;
grant execute on function public.submit_random_message(uuid,text,text,text) to authenticated;

create or replace function public.notify_interaction() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.action in ('like','superfuego') and (tg_op='INSERT' or old.action is distinct from new.action) then
    insert into public.user_notifications(user_id,kind,title,body,href,actor_user_id)
    values(new.to_user_id,'like',case when new.action='superfuego' then '🔥 Recibiste un SuperFuego' else 'Alguien mostró interés' end,'Entra a CitaFuego para seguir conectando.','/likes',new.from_user_id);
  end if;
  return new;
end; $$;
revoke all on function public.notify_interaction() from public,anon,authenticated;
drop trigger if exists interaction_notification_trigger on public.interactions;
create trigger interaction_notification_trigger after insert or update of action on public.interactions for each row execute function public.notify_interaction();

create or replace function public.notify_match() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.status='active' and (tg_op='INSERT' or old.status is distinct from new.status) then
    insert into public.user_notifications(user_id,kind,title,body,href,actor_user_id)
    values(new.user_a,'match','🔥 Nuevo Match','El interés es mutuo. Ya pueden conversar.','/matches',new.user_b),
          (new.user_b,'match','🔥 Nuevo Match','El interés es mutuo. Ya pueden conversar.','/matches',new.user_a);
  end if;
  return new;
end; $$;
revoke all on function public.notify_match() from public,anon,authenticated;
drop trigger if exists match_notification_trigger on public.matches;
create trigger match_notification_trigger after insert or update of status on public.matches for each row execute function public.notify_match();

create or replace function public.notify_message() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.status='sent' then
    insert into public.user_notifications(user_id,kind,title,body,href,actor_user_id)
    select cm.user_id,'message','Nuevo mensaje',left(coalesce(new.body,''),120),'/chats/'||new.conversation_id::text,new.sender_id
    from public.conversation_members cm where cm.conversation_id=new.conversation_id and cm.user_id<>new.sender_id;
  end if;
  return new;
end; $$;
revoke all on function public.notify_message() from public,anon,authenticated;
drop trigger if exists message_notification_trigger on public.messages;
create trigger message_notification_trigger after insert on public.messages for each row execute function public.notify_message();

create index if not exists analytics_impression_user_time_idx on public.analytics_events(user_id,occurred_at desc) where event_name='profile_impression';
create index if not exists boost_active_user_idx on public.boost_activations(user_id,ends_at desc);

-- Add realtime tables only once.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='random_chat_messages') then alter publication supabase_realtime add table public.random_chat_messages; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='random_signals') then alter publication supabase_realtime add table public.random_signals; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_notifications') then alter publication supabase_realtime add table public.user_notifications; end if;
end $$;
