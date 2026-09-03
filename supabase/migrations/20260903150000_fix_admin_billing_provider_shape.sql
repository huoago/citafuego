-- Keep the admin billing contract aligned with the current commercialization_providers schema.
create or replace function public.admin_get_billing_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'auth'
as $function$
begin
 if not public.admin_has_any_role(array['super_admin','finance','analyst']) then raise exception 'forbidden'; end if;
 return jsonb_build_object(
  'subscriptions',jsonb_build_object('active',(select count(*) from public.subscriptions where status='active'),'pastDue',(select count(*) from public.subscriptions where status='past_due')),
  'purchases',jsonb_build_object('total',(select count(*) from public.purchases),'paid',(select count(*) from public.purchases where status='paid'),'failed',(select count(*) from public.purchases where status='failed')),
  'providers',(select coalesce(jsonb_agg(jsonb_build_object('slug',provider_slug,'enabled',status='live','mode',status) order by provider_slug),'[]'::jsonb) from public.commercialization_providers),
  'gate',jsonb_build_object('payments',coalesce((select enabled from public.feature_flags where key='PAYMENTS_ENABLED'),false),'membership',coalesce((select enabled from public.feature_flags where key='MEMBERSHIP_ENABLED'),false))
 );
end $function$;
