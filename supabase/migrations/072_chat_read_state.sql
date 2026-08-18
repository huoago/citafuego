create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_message_id uuid references public.messages(id) on delete set null,
  last_read_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (conversation_id,user_id)
);

alter table public.conversation_reads enable row level security;
revoke all on table public.conversation_reads from public,anon,authenticated;
grant select,insert,update,delete on table public.conversation_reads to service_role;

-- Do not surprise existing users with a backlog badge when read-state launches.
-- Existing conversations start read through their latest currently delivered message.
insert into public.conversation_reads(conversation_id,user_id,last_read_message_id,last_read_at,updated_at)
select c.id,m.user_a,latest.id,coalesce(latest.created_at,c.created_at),now()
from public.conversations c
join public.matches m on m.id=c.match_id
left join lateral(
  select msg.id,msg.created_at
  from public.messages msg
  where msg.conversation_id=c.id
    and msg.status='sent'
    and msg.deleted_at is null
  order by msg.created_at desc
  limit 1
) latest on true
where m.user_a is not null
union all
select c.id,m.user_b,latest.id,coalesce(latest.created_at,c.created_at),now()
from public.conversations c
join public.matches m on m.id=c.match_id
left join lateral(
  select msg.id,msg.created_at
  from public.messages msg
  where msg.conversation_id=c.id
    and msg.status='sent'
    and msg.deleted_at is null
  order by msg.created_at desc
  limit 1
) latest on true
where m.user_b is not null
on conflict(conversation_id,user_id) do nothing;

create or replace function public.get_my_unread_chat_count()
returns bigint
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_user uuid:=auth.uid();
  v_count bigint;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select count(msg.id)::bigint into v_count
  from public.conversations c
  join public.matches m on m.id=c.match_id and m.status='active'
  join public.profiles p on p.id=case when m.user_a=v_user then m.user_b else m.user_a end and p.status='active'
  left join public.conversation_reads cr on cr.conversation_id=c.id and cr.user_id=v_user
  join public.messages msg on msg.conversation_id=c.id
    and msg.sender_id<>v_user
    and msg.status='sent'
    and msg.deleted_at is null
    and msg.created_at>coalesce(cr.last_read_at,c.created_at)
  where c.status='active'
    and (m.user_a=v_user or m.user_b=v_user)
    and not exists(
      select 1 from public.blocks b
      where (b.blocker_id=v_user and b.blocked_id=p.id)
         or (b.blocker_id=p.id and b.blocked_id=v_user)
    );

  return coalesce(v_count,0);
end;
$$;

create or replace function public.get_my_chat_unread_counts()
returns table(conversation_id uuid,unread_count bigint)
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  return query
  select c.id,count(msg.id)::bigint
  from public.conversations c
  join public.matches m on m.id=c.match_id and m.status='active'
  join public.profiles p on p.id=case when m.user_a=v_user then m.user_b else m.user_a end and p.status='active'
  left join public.conversation_reads cr on cr.conversation_id=c.id and cr.user_id=v_user
  left join public.messages msg on msg.conversation_id=c.id
    and msg.sender_id<>v_user
    and msg.status='sent'
    and msg.deleted_at is null
    and msg.created_at>coalesce(cr.last_read_at,c.created_at)
  where c.status='active'
    and (m.user_a=v_user or m.user_b=v_user)
    and not exists(
      select 1 from public.blocks b
      where (b.blocker_id=v_user and b.blocked_id=p.id)
         or (b.blocker_id=p.id and b.blocked_id=v_user)
    )
  group by c.id;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation uuid,p_message uuid)
returns bigint
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid:=auth.uid();
  v_read_at timestamptz;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not public.can_send_message(p_conversation) then raise exception 'conversation_unavailable'; end if;

  select msg.created_at into v_read_at
  from public.messages msg
  where msg.id=p_message
    and msg.conversation_id=p_conversation
    and msg.sender_id<>v_user
    and msg.status='sent'
    and msg.deleted_at is null;

  if v_read_at is null then raise exception 'invalid_read_cursor'; end if;

  insert into public.conversation_reads(conversation_id,user_id,last_read_message_id,last_read_at,updated_at)
  values(p_conversation,v_user,p_message,v_read_at,now())
  on conflict(conversation_id,user_id) do update
    set last_read_message_id=excluded.last_read_message_id,
        last_read_at=excluded.last_read_at,
        updated_at=now()
    where excluded.last_read_at>public.conversation_reads.last_read_at;

  return public.get_my_unread_chat_count();
end;
$$;

revoke all on function public.get_my_unread_chat_count() from public;
revoke all on function public.get_my_chat_unread_counts() from public;
revoke all on function public.mark_conversation_read(uuid,uuid) from public;
revoke execute on function public.get_my_unread_chat_count() from anon;
revoke execute on function public.get_my_chat_unread_counts() from anon;
revoke execute on function public.mark_conversation_read(uuid,uuid) from anon;
grant execute on function public.get_my_unread_chat_count() to authenticated;
grant execute on function public.get_my_chat_unread_counts() to authenticated;
grant execute on function public.mark_conversation_read(uuid,uuid) to authenticated;
grant execute on function public.get_my_unread_chat_count() to service_role;
grant execute on function public.get_my_chat_unread_counts() to service_role;
grant execute on function public.mark_conversation_read(uuid,uuid) to service_role;
