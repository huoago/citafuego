-- V20: browsing Discover no longer depends on profile activation.
-- Keep age/legal registration and account sanctions enforced by the application shell.
-- Add per-user UI preferences and remove direct RPC exposure from trigger-only SECURITY DEFINER functions.

create table if not exists public.user_ui_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'noche' check (theme in ('noche','fuego','oceano','bosque','uva')),
  custom_background text null check (custom_background is null or custom_background ~ '^#[0-9A-Fa-f]{6}$'),
  module_layout jsonb not null default '[{"id":"completion","colSpan":2,"rowSpan":1,"visible":true},{"id":"social","colSpan":2,"rowSpan":1,"visible":true},{"id":"bio","colSpan":2,"rowSpan":1,"visible":true},{"id":"handle","colSpan":1,"rowSpan":1,"visible":true},{"id":"shortcuts","colSpan":1,"rowSpan":2,"visible":true}]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_ui_preferences_layout_is_array check (jsonb_typeof(module_layout)='array')
);

alter table public.user_ui_preferences enable row level security;
revoke all on table public.user_ui_preferences from anon;
grant select,insert,update,delete on table public.user_ui_preferences to authenticated;

drop policy if exists "ui_preferences_select_own" on public.user_ui_preferences;
create policy "ui_preferences_select_own" on public.user_ui_preferences for select to authenticated using (user_id=auth.uid());
drop policy if exists "ui_preferences_insert_own" on public.user_ui_preferences;
create policy "ui_preferences_insert_own" on public.user_ui_preferences for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "ui_preferences_update_own" on public.user_ui_preferences;
create policy "ui_preferences_update_own" on public.user_ui_preferences for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "ui_preferences_delete_own" on public.user_ui_preferences;
create policy "ui_preferences_delete_own" on public.user_ui_preferences for delete to authenticated using (user_id=auth.uid());

-- Remove only the current-user activation wall from the established discovery RPCs.
-- Candidate profiles remain limited to active accounts inside get_discover_candidates.
do $$
declare
  vdef text;
begin
  select pg_get_functiondef('public.get_discover_candidates(integer)'::regprocedure) into vdef;
  vdef:=regexp_replace(vdef,E'\\n\\s*if not exists\\(select 1 from public\\.profiles where id=v_user and status=''active''\\) then raise exception ''profile_not_active''; end if;','', 'g');
  if position('profile_not_active' in vdef)>0 then raise exception 'unable_to_remove_discover_candidate_activation_gate'; end if;
  execute vdef;

  select pg_get_functiondef('public.get_discover_page_v3(integer,integer)'::regprocedure) into vdef;
  vdef:=regexp_replace(vdef,E'\\n\\s*if not exists\\(select 1 from public\\.profiles where id=v_user and status=''active''\\) then raise exception ''profile_not_active''; end if;','', 'g');
  if position('profile_not_active' in vdef)>0 then raise exception 'unable_to_remove_discover_page_activation_gate'; end if;
  execute vdef;
end $$;

-- These tables were intentionally RPC/service-only, but had RLS enabled without an explicit policy.
-- Make the deny model explicit and also remove direct anon/authenticated table privileges.
do $$
declare
  t text;
begin
  foreach t in array array[
    'account_auth_rate_limits','account_usernames','ad_delivery_requests','blog_comments','blog_likes','blog_shares',
    'conversation_reads','private_album_grants','private_album_items','private_album_views','private_albums','push_subscriptions','user_rate_limit_buckets'
  ] loop
    execute format('revoke all on table public.%I from anon, authenticated',t);
    execute format('drop policy if exists "deny_direct_access_v20" on public.%I',t);
    execute format('create policy "deny_direct_access_v20" on public.%I for all to authenticated using (false) with check (false)',t);
  end loop;
end $$;

-- Trigger-only SECURITY DEFINER functions must never be callable as public REST RPCs.
revoke all on function public.enforce_interaction_trust() from public, anon, authenticated;
revoke all on function public.enforce_message_rate_limit() from public, anon, authenticated;
revoke all on function public.handle_citafuego_new_user() from public, anon, authenticated;
revoke all on function public.notify_interaction() from public, anon, authenticated;
revoke all on function public.notify_match() from public, anon, authenticated;
revoke all on function public.sync_content_topic_vector() from public, anon, authenticated;

comment on table public.user_ui_preferences is 'Per-user appearance and profile-module layout preferences; never used as a trust or access gate.';
