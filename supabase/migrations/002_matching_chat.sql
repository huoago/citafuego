-- CitaFuego V1.0 / 002_matching_chat.sql

create type public.interaction_action as enum ('pass', 'like', 'superfuego');
create type public.match_status as enum ('active', 'unmatched', 'blocked');
create type public.message_type as enum ('text', 'image', 'voice', 'system');
create type public.message_status as enum ('pending', 'sent', 'held', 'removed');

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  action public.interaction_action not null,
  source text not null default 'discover',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_user_id <> to_user_id),
  unique(from_user_id, to_user_id)
);

create index interactions_to_action_idx on public.interactions(to_user_id, action, created_at desc);

create trigger interactions_set_updated_at
before update on public.interactions
for each row execute function public.set_updated_at();

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  status public.match_status not null default 'active',
  matched_at timestamptz not null default now(),
  ended_at timestamptz,
  check (user_a <> user_b),
  unique(user_a, user_b)
);

create index matches_user_a_idx on public.matches(user_a, status, matched_at desc);
create index matches_user_b_idx on public.matches(user_b, status, matched_at desc);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid unique references public.matches(id) on delete cascade,
  status text not null default 'active' check (status in ('active','closed','restricted')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  muted_until timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  type public.message_type not null default 'text',
  body text,
  status public.message_status not null default 'pending',
  client_message_id text,
  moderation_event_id uuid,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  unique(sender_id, client_message_id),
  check ((type = 'text' and body is not null) or type <> 'text')
);

create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  moderation_status public.photo_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Ready for V1.5 'real date' flow without breaking the schema later.
create table public.date_proposals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  proposed_by uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  proposed_at timestamptz,
  area_label text,
  status text not null default 'proposed' check (status in ('proposed','accepted','declined','cancelled','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger date_proposals_set_updated_at
before update on public.date_proposals
for each row execute function public.set_updated_at();

-- RLS
alter table public.interactions enable row level security;
alter table public.matches enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.blocks enable row level security;
alter table public.date_proposals enable row level security;

create policy interactions_self_read
on public.interactions for select
to authenticated
using (from_user_id = auth.uid() or to_user_id = auth.uid());

-- Like/pass mutations go through a trusted server endpoint so quotas, blocks and paid
-- SuperFuego entitlements cannot be bypassed by a modified client.
revoke insert, update, delete on public.interactions from authenticated;

create policy matches_members_read
on public.matches for select
to authenticated
using (user_a = auth.uid() or user_b = auth.uid());

create policy conversations_members_read
on public.conversations for select
to authenticated
using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = id and cm.user_id = auth.uid()
  )
);

create policy conversation_members_self_read
on public.conversation_members for select
to authenticated
using (user_id = auth.uid());

create policy messages_members_read
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
  )
);

-- Messages are inserted by the trusted message API after membership, rate-limit and
-- moderation checks. Direct client insertion is intentionally disabled.
revoke insert, update, delete on public.messages from authenticated;

create policy message_attachments_member_read
on public.message_attachments for select
to authenticated
using (
  exists (
    select 1
    from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = message_id and cm.user_id = auth.uid()
  )
);

create policy blocks_self_all
on public.blocks for all
to authenticated
using (blocker_id = auth.uid())
with check (blocker_id = auth.uid());

create policy date_proposals_match_members_read
on public.date_proposals for select
to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
  )
);

create policy date_proposals_member_insert
on public.date_proposals for insert
to authenticated
with check (
  proposed_by = auth.uid()
  and status = 'proposed'
  and exists (
    select 1 from public.matches m
    where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
  )
);

revoke insert on public.date_proposals from authenticated;
grant insert (match_id, proposed_by, activity_type, proposed_at, area_label) on public.date_proposals to authenticated;
