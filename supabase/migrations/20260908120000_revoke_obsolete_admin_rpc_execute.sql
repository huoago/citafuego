-- Obsolete compatibility RPCs are no longer part of the production admin surface.
-- Keep them callable only by trusted server-side service-role clients.

do $$
declare
  signature text;
begin
  foreach signature in array array[
    'public.admin_get_billing_overview()',
    'public.admin_get_district_settings()',
    'public.admin_get_lima_launch_dashboard()',
    'public.admin_get_location_metrics_v2()',
    'public.admin_get_operations_metrics(integer)',
    'public.admin_get_site_settings()',
    'public.admin_get_users(integer)',
    'public.admin_has_any_role(text[])',
    'public.admin_revoke_super_admin(uuid,text,text)',
    'public.admin_set_site_setting(text,text,jsonb,text)',
    'public.admin_update_district(text,text,integer,text[],text)'
  ]
  loop
    if to_regprocedure(signature) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', signature);
      execute format('grant execute on function %s to service_role', signature);
    end if;
  end loop;
end
$$;
