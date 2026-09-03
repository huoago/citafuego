create or replace function public.admin_search_membership_recipients(p_query text, p_limit integer default 25)
returns table(user_id uuid, display_name text, email text, status public.account_status)
language plpgsql
stable
security definer
set search_path='public','auth','pg_temp'
as $$
declare
  q text:=nullif(trim(coalesce(p_query,'')),'');
  lim integer:=least(greatest(coalesce(p_limit,25),1),50);
begin
  if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden' using errcode='42501'; end if;
  if q is null then return; end if;
  return query
  select u.id,p.display_name,u.email::text,p.status
  from auth.users u
  left join public.profiles p on p.id=u.id
  where u.id::text ilike '%'||q||'%'
     or coalesce(u.email,'') ilike '%'||q||'%'
     or coalesce(p.display_name,'') ilike '%'||q||'%'
  order by coalesce(u.last_sign_in_at,u.created_at) desc nulls last
  limit lim;
end;$$;
revoke all on function public.admin_search_membership_recipients(text,integer) from public,anon;
grant execute on function public.admin_search_membership_recipients(text,integer) to authenticated;
