-- Finance/analyst backoffice must be able to inspect all payment records without weakening user self-read policies.
drop policy if exists purchases_admin_read on public.purchases;
create policy purchases_admin_read on public.purchases for select to authenticated using(public.admin_has_any_role(array['super_admin','finance','analyst']));

drop policy if exists subscriptions_admin_read on public.subscriptions;
create policy subscriptions_admin_read on public.subscriptions for select to authenticated using(public.admin_has_any_role(array['super_admin','finance','analyst']));

drop policy if exists catalog_products_admin_read on public.catalog_products;
create policy catalog_products_admin_read on public.catalog_products for select to authenticated using(public.admin_has_any_role(array['super_admin','finance','analyst']));
