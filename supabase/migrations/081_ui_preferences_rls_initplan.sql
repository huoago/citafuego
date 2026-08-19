-- V20.1: avoid per-row auth.uid() evaluation in UI preference RLS policies.

drop policy if exists "ui_preferences_select_own" on public.user_ui_preferences;
create policy "ui_preferences_select_own" on public.user_ui_preferences
for select to authenticated using (user_id=(select auth.uid()));

drop policy if exists "ui_preferences_insert_own" on public.user_ui_preferences;
create policy "ui_preferences_insert_own" on public.user_ui_preferences
for insert to authenticated with check (user_id=(select auth.uid()));

drop policy if exists "ui_preferences_update_own" on public.user_ui_preferences;
create policy "ui_preferences_update_own" on public.user_ui_preferences
for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists "ui_preferences_delete_own" on public.user_ui_preferences;
create policy "ui_preferences_delete_own" on public.user_ui_preferences
for delete to authenticated using (user_id=(select auth.uid()));
