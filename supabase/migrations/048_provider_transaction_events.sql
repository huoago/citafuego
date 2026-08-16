create table if not exists public.provider_transaction_events(
  id bigint generated always as identity primary key,
  provider_slug text not null references public.commercialization_providers(provider_slug),
  external_event_ref text not null,
  event_kind text not null,
  reference text,
  amount_usd_micros bigint,
  currency_code text,
  status text not null default 'received' check(status in ('received','processed','ignored','failed')),
  metadata jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider_slug,external_event_ref,event_kind)
);
alter table public.provider_transaction_events enable row level security;
create policy provider_events_admin_read on public.provider_transaction_events for select to authenticated using(public.admin_has_any_role(array['super_admin','finance','analyst']));
grant select on public.provider_transaction_events to authenticated;
revoke insert,update,delete on public.provider_transaction_events from authenticated,anon;
