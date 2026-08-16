-- Random queue cancellation helper. Keeps queue state server-authoritative.
create or replace function public.cancel_random_queue() returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from public.random_match_queue where user_id=auth.uid();
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.cancel_random_queue() from public,anon;
grant execute on function public.cancel_random_queue() to authenticated;
