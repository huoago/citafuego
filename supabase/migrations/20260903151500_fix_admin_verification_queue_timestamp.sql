-- verification_sessions uses started_at/completed_at; there is no created_at column.
create or replace function public.get_admin_verification_queue(p_limit integer default 50)
returns setof jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.is_trust_admin(auth.uid()) then raise exception 'forbidden' using errcode='42501'; end if;
  return query
  select to_jsonb(x)
  from (
    select *
    from public.verification_sessions
    order by started_at desc
    limit least(greatest(p_limit,1),100)
  ) x;
end $function$;
