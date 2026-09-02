create or replace function public.admin_get_provider_status_v2()
returns table(provider_slug text,display_name text,provider_kind text,status text,secrets_configured boolean,account_configured boolean,updated_at timestamptz)
language plpgsql stable security definer set search_path='public','pg_temp' as $$
begin
  if not public.admin_has_any_role(array['super_admin','finance','analyst']) then raise exception 'forbidden' using errcode='42501'; end if;
  return query select p.provider_slug,p.display_name,p.provider_kind,p.status,coalesce(array_length(p.secret_env_refs,1),0)>0,nullif(trim(coalesce(p.account_reference,'')),'') is not null,p.updated_at from public.commercialization_providers p order by p.provider_kind,p.provider_slug;
end;$$;
revoke all on function public.admin_get_provider_status_v2() from public,anon;
grant execute on function public.admin_get_provider_status_v2() to authenticated;