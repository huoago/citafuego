-- Restrict SECURITY DEFINER date proposal read model to signed-in users only.
revoke all on function public.get_active_date_proposal(uuid) from public,anon;
grant execute on function public.get_active_date_proposal(uuid) to authenticated;
