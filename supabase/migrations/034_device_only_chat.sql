-- CitaFuego / device-only chat enforcement.
-- Message content must never be persisted by the application backend.

-- Disable the legacy matched-chat persistence path. The table remains only as an
-- empty legacy schema object so historical migrations and admin read models stay reversible.
drop trigger if exists message_notification_trigger on public.messages;
drop function if exists public.notify_message();
revoke all on function public.submit_message(uuid,text,text,text,jsonb) from authenticated,anon,public;
revoke select,insert,update,delete on public.messages from authenticated,anon;

do $$ begin
  if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime drop table public.messages;
  end if;
end $$;
comment on table public.messages is 'Legacy schema only. New CitaFuego chat content is device-only and backend writes are disabled.';

-- Random text also uses WebRTC DataChannel; remove the temporary server-message table
-- introduced by migration 032 before this feature is released.
revoke all on function public.submit_random_message(uuid,text,text,text) from authenticated,anon,public;
drop function if exists public.submit_random_message(uuid,text,text,text);
do $$ begin
  if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='random_chat_messages') then
    alter publication supabase_realtime drop table public.random_chat_messages;
  end if;
end $$;
drop table if exists public.random_chat_messages cascade;

-- Existing message notifications must never contain a server-side message preview.
update public.user_notifications set body='Tienes actividad nueva en un chat privado.' where kind='message';

-- Short-lived WebRTC signaling metadata. Payloads are only SDP/ICE negotiation data,
-- never text, audio, video, attachments, or chat history.
create table if not exists public.conversation_signals(
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  signal_type text not null check(signal_type in ('offer','answer','ice','hangup')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '10 minutes')
);
create index if not exists conversation_signals_conversation_id_idx on public.conversation_signals(conversation_id,id);
create index if not exists conversation_signals_expiry_idx on public.conversation_signals(expires_at);
alter table public.conversation_signals enable row level security;
drop policy if exists conversation_signals_participant_read on public.conversation_signals;
create policy conversation_signals_participant_read on public.conversation_signals for select to authenticated using (
  expires_at>now() and exists(select 1 from public.conversation_members cm where cm.conversation_id=conversation_signals.conversation_id and cm.user_id=auth.uid())
);
drop policy if exists conversation_signals_participant_insert on public.conversation_signals;
create policy conversation_signals_participant_insert on public.conversation_signals for insert to authenticated with check (
  sender_id=auth.uid() and expires_at<=now()+interval '11 minutes' and exists(
    select 1 from public.conversation_members cm join public.conversations c on c.id=cm.conversation_id
    where cm.conversation_id=conversation_signals.conversation_id and cm.user_id=auth.uid() and c.status='active'
  )
);
drop policy if exists conversation_signals_sender_delete on public.conversation_signals;
create policy conversation_signals_sender_delete on public.conversation_signals for delete to authenticated using(sender_id=auth.uid());
grant select,insert,delete on public.conversation_signals to authenticated;
grant usage,select on sequence public.conversation_signals_id_seq to authenticated;
comment on table public.conversation_signals is 'Ephemeral WebRTC signaling metadata only. Chat content is prohibited.';

-- Random-call signaling is also ephemeral metadata.
alter table public.random_signals add column if not exists expires_at timestamptz;
update public.random_signals set expires_at=created_at+interval '10 minutes' where expires_at is null;
alter table public.random_signals alter column expires_at set default (now()+interval '10 minutes');
alter table public.random_signals alter column expires_at set not null;
create index if not exists random_signals_expiry_idx on public.random_signals(expires_at);
drop policy if exists random_signals_participant_read on public.random_signals;
create policy random_signals_participant_read on public.random_signals for select to authenticated using (
  expires_at>now() and exists(select 1 from public.random_match_sessions s where s.id=session_id and auth.uid() in (s.user_a,s.user_b))
);
comment on table public.random_signals is 'Ephemeral WebRTC SDP/ICE metadata only; no text, audio or video content.';

-- Metadata-only notification: the backend may know that a delivery event occurred,
-- but never receives the body. It is intentionally generic.
create or replace function public.notify_device_message(p_conversation uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_peer uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not public.can_send_message(p_conversation) then raise exception 'conversation_unavailable'; end if;
  select cm.user_id into v_peer from public.conversation_members cm where cm.conversation_id=p_conversation and cm.user_id<>v_user limit 1;
  if v_peer is null then raise exception 'conversation_unavailable'; end if;
  if not public.consume_user_rate_limit(v_user,'device_message_notify_minute',30,'minute') then return jsonb_build_object('ok',true,'rate_limited',true); end if;
  insert into public.user_notifications(user_id,kind,title,body,href,actor_user_id)
  values(v_peer,'message','Nuevo mensaje privado','Abre CitaFuego para conectar directamente con tu Match.','/chats/'||p_conversation::text,v_user);
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.notify_device_message(uuid) from public,anon;
grant execute on function public.notify_device_message(uuid) to authenticated;

-- The match list no longer derives previews or ordering from server-stored messages.
create or replace function public.get_my_matches(p_limit integer default 50)
returns table(match_id uuid,conversation_id uuid,other_profile_id uuid,display_name text,district text,verified boolean,primary_photo_path text,matched_at timestamptz,last_message_at timestamptz,last_message_preview text)
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); begin
if v_user is null then raise exception 'not_authenticated'; end if;
return query select m.id,c.id,p.id,p.display_name,p.district,p.verification_badge,photo.storage_path,m.matched_at,null::timestamptz,null::text
from public.matches m join public.conversations c on c.match_id=m.id and c.status='active'
join public.profiles p on p.id=case when m.user_a=v_user then m.user_b else m.user_a end and p.status='active'
left join lateral(select pp.storage_path from public.profile_photos pp where pp.user_id=p.id and pp.status='approved' order by pp.is_primary desc,pp.position asc limit 1) photo on true
where m.status='active' and (m.user_a=v_user or m.user_b=v_user) and not exists(select 1 from public.blocks b where (b.blocker_id=v_user and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=v_user))
order by m.matched_at desc limit least(greatest(coalesce(p_limit,50),1),100);
end; $$;
revoke all on function public.get_my_matches(integer) from public,anon;
grant execute on function public.get_my_matches(integer) to authenticated;
