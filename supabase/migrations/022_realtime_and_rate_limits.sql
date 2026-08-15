-- CitaFuego V1.0 RC / 019_realtime_and_rate_limits.sql
-- Server-enforced message limits and Realtime publication. Additive and rollback-friendly.

create table if not exists public.user_rate_limit_buckets (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  window_started_at timestamptz not null,
  count integer not null default 0 check(count>=0),
  primary key(user_id,scope,window_started_at)
);
alter table public.user_rate_limit_buckets enable row level security;
revoke all on public.user_rate_limit_buckets from anon,authenticated;

create or replace function public.consume_user_rate_limit(p_user uuid,p_scope text,p_limit integer,p_window text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_start timestamptz; v_count integer;
begin
  if p_user is null or p_limit<1 then return false; end if;
  v_start:=case p_window when 'minute' then date_trunc('minute',now()) when 'hour' then date_trunc('hour',now()) else date_trunc('day',now()) end;
  insert into public.user_rate_limit_buckets(user_id,scope,window_started_at,count) values(p_user,p_scope,v_start,1)
  on conflict(user_id,scope,window_started_at) do update set count=public.user_rate_limit_buckets.count+1
  returning count into v_count;
  return v_count<=p_limit;
end; $$;
revoke all on function public.consume_user_rate_limit(uuid,text,integer,text) from public,anon,authenticated;

create or replace function public.submit_message(p_conversation uuid,p_client_message_id text,p_text text,p_provider_action text default 'allow',p_labels jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user uuid:=auth.uid(); v_status_text text:='sent'; v_action_text text:='allow'; v_id uuid; v_event uuid; v_created timestamptz; v_lower text; v_minute_limit integer:=30;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not public.can_send_message(p_conversation) then raise exception 'conversation_unavailable'; end if;
  if exists(select 1 from public.sanctions s where s.user_id=v_user and s.active and s.type='message_limit' and (s.ends_at is null or s.ends_at>now())) then v_minute_limit:=5; end if;
  if not public.consume_user_rate_limit(v_user,'message_minute',v_minute_limit,'minute') or not public.consume_user_rate_limit(v_user,'message_hour',240,'hour') then raise exception 'message_rate_limited'; end if;
  if length(trim(p_text))<1 or length(p_text)>2000 or length(p_client_message_id)<6 or length(p_client_message_id)>100 then raise exception 'invalid_message'; end if;
  v_lower:=lower(p_text);
  if p_provider_action='block' then raise exception 'message_blocked'; end if;
  if p_provider_action='hold' or v_lower ~ '(pago por|escort|prostitu|sugar daddy|sugar baby|menor de edad|inversi[oó]n cripto|telegram.{0,20}(pago|sexo)|whatsapp.{0,20}(pago|sexo))' then v_status_text:='held';v_action_text:='hold'; end if;
  insert into public.moderation_events(user_id,surface,object_type,object_id,provider,policy_version,labels,action,reasons,human_review)
  values(v_user,'message','draft_message',p_client_message_id,'server_pipeline','2026-08-v1',coalesce(p_labels,'{}'::jsonb),v_action_text::public.moderation_action,array[]::text[],v_status_text='held') returning id into v_event;
  insert into public.messages(conversation_id,sender_id,type,body,status,client_message_id,moderation_event_id)
  values(p_conversation,v_user,'text',trim(p_text),v_status_text::public.message_status,p_client_message_id,v_event)
  on conflict(sender_id,client_message_id) do update set sender_id=excluded.sender_id returning id,created_at into v_id,v_created;
  if v_status_text='sent' then update public.conversations set last_message_at=now() where id=p_conversation; end if;
  return jsonb_build_object('id',v_id,'conversation_id',p_conversation,'status',v_status_text,'created_at',v_created,'body',trim(p_text),'sender_id',v_user);
end; $$;
revoke all on function public.submit_message(uuid,text,text,text,jsonb) from public,anon;
grant execute on function public.submit_message(uuid,text,text,text,jsonb) to authenticated;

-- Add messages to Realtime publication once. RLS still controls what each subscriber can receive.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

create index if not exists user_rate_limit_cleanup_idx on public.user_rate_limit_buckets(window_started_at);
