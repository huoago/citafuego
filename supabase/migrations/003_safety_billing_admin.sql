-- CitaFuego V1.0 / 003_safety_billing_admin.sql

create type public.report_status as enum ('open', 'triaged', 'investigating', 'resolved', 'dismissed');
create type public.case_priority as enum ('p0', 'p1', 'p2', 'p3');
create type public.moderation_action as enum ('allow', 'warn', 'hold', 'block');
create type public.sanction_type as enum ('warning', 'message_limit', 'discover_hidden', 'suspension', 'ban');
create type public.subscription_status as enum ('trialing','active','past_due','cancelled','expired');

create table public.verification_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_session_id text,
  status text not null default 'pending' check (status in ('pending','verified','rejected','expired','error')),
  confidence numeric(5,4),
  reason_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index verification_sessions_user_idx on public.verification_sessions(user_id, started_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  category text not null,
  description text,
  status public.report_status not null default 'open',
  priority public.case_priority not null default 'p2',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (reporter_id <> reported_user_id)
);

create index reports_queue_idx on public.reports(status, priority, created_at);
create index reports_reported_user_idx on public.reports(reported_user_id, created_at desc);

create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  surface text not null,
  object_type text not null,
  object_id text not null,
  provider text not null,
  model_version text,
  policy_version text not null,
  labels jsonb not null default '{}'::jsonb,
  action public.moderation_action not null,
  reasons text[] not null default '{}'::text[],
  human_review boolean not null default false,
  created_at timestamptz not null default now()
);

create index moderation_events_object_idx on public.moderation_events(object_type, object_id, created_at desc);
create index moderation_events_user_idx on public.moderation_events(user_id, created_at desc);

create table public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid references auth.users(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  priority public.case_priority not null,
  status text not null default 'open' check (status in ('open','assigned','resolved','dismissed','escalated')),
  reason text not null,
  assigned_admin_id uuid,
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.risk_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  signal_type text not null,
  weight numeric(6,3) not null default 0,
  source text not null,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.user_risk_scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  score numeric(6,3) not null default 0,
  tier text not null default 'low' check (tier in ('low','medium','high','critical')),
  version text not null,
  calculated_at timestamptz not null default now()
);

create table public.sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.sanction_type not null,
  reason_code text not null,
  reason_note text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index sanctions_user_active_idx on public.sanctions(user_id, active, created_at desc);

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  sanction_id uuid not null references public.sanctions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  statement text not null check (char_length(statement) between 5 and 2000),
  status text not null default 'submitted' check (status in ('submitted','reviewing','accepted','rejected')),
  reviewed_by uuid,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Billing catalogue is provider-agnostic.
create table public.catalog_products (
  id text primary key,
  kind text not null check (kind in ('subscription','boost','superfuego_pack')),
  name text not null,
  tier text,
  entitlements jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.catalog_prices (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.catalog_products(id) on delete cascade,
  country_code char(2) not null,
  currency char(3) not null,
  amount_minor integer not null check (amount_minor >= 0),
  billing_period text,
  cohort text not null default 'default',
  provider_price_id text,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  active boolean not null default true
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.catalog_products(id),
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text unique,
  status public.subscription_status not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.catalog_products(id),
  provider text not null,
  provider_payment_id text unique,
  amount_minor integer not null,
  currency char(3) not null,
  status text not null check (status in ('pending','paid','failed','refunded','chargeback')),
  idempotency_key text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger purchases_set_updated_at
before update on public.purchases
for each row execute function public.set_updated_at();

create table public.entitlement_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement text not null,
  delta integer not null,
  source_type text not null,
  source_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.boost_activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  source text not null,
  created_at timestamptz not null default now(),
  check (ends_at > started_at)
);

-- Admin / audit
create table public.admin_roles (
  id text primary key,
  name text not null,
  permissions jsonb not null default '[]'::jsonb
);

create table public.admin_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id text not null references public.admin_roles(id) on delete cascade,
  granted_by uuid,
  granted_at timestamptz not null default now(),
  primary key(user_id, role_id)
);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  object_type text not null,
  object_id text,
  reason text,
  before_summary jsonb,
  after_summary jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_idx on public.admin_audit_log(created_at desc);

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  session_id text,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index analytics_events_name_time_idx on public.analytics_events(event_name, occurred_at desc);

-- RLS: safety/admin tables intentionally expose very little to clients.
alter table public.verification_sessions enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_events enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.risk_signals enable row level security;
alter table public.user_risk_scores enable row level security;
alter table public.sanctions enable row level security;
alter table public.appeals enable row level security;
alter table public.catalog_products enable row level security;
alter table public.catalog_prices enable row level security;
alter table public.subscriptions enable row level security;
alter table public.purchases enable row level security;
alter table public.entitlement_ledger enable row level security;
alter table public.boost_activations enable row level security;
alter table public.admin_roles enable row level security;
alter table public.admin_user_roles enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.feature_flags enable row level security;
alter table public.analytics_events enable row level security;

create policy verification_self_read
on public.verification_sessions for select
to authenticated
using (user_id = auth.uid());

create policy reports_reporter_insert
on public.reports for insert
to authenticated
with check (reporter_id = auth.uid());

revoke insert on public.reports from authenticated;
grant insert (reporter_id, reported_user_id, conversation_id, message_id, category, description) on public.reports to authenticated;

create policy reports_reporter_read
on public.reports for select
to authenticated
using (reporter_id = auth.uid());

create policy sanctions_self_read
on public.sanctions for select
to authenticated
using (user_id = auth.uid());

create policy appeals_self_read
on public.appeals for select
to authenticated
using (user_id = auth.uid());

create policy appeals_self_insert
on public.appeals for insert
to authenticated
with check (user_id = auth.uid());

revoke insert on public.appeals from authenticated;
grant insert (sanction_id, user_id, statement) on public.appeals to authenticated;

create policy products_read
on public.catalog_products for select
to authenticated
using (active = true);

create policy prices_read
on public.catalog_prices for select
to authenticated
using (active = true and (valid_to is null or valid_to > now()));

create policy subscriptions_self_read
on public.subscriptions for select
to authenticated
using (user_id = auth.uid());

create policy purchases_self_read
on public.purchases for select
to authenticated
using (user_id = auth.uid());

create policy ledger_self_read
on public.entitlement_ledger for select
to authenticated
using (user_id = auth.uid());

create policy boosts_self_read
on public.boost_activations for select
to authenticated
using (user_id = auth.uid());

create policy analytics_self_insert
on public.analytics_events for insert
to authenticated
with check (user_id = auth.uid() or user_id is null);
