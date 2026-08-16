-- CitaFuego launch pricing for Peru. USD is used by the configured Segpay Dynamic Pricing integration.
-- These are platform launch prices, independent of competitor pricing and may later be A/B tested by cohort.
insert into public.catalog_prices(product_id,country_code,currency,amount_minor,billing_period,cohort,active)
select 'fuego_plus','PE','USD',699,'month','launch-2026',true
where not exists(select 1 from public.catalog_prices where product_id='fuego_plus' and country_code='PE' and currency='USD' and cohort='launch-2026');
insert into public.catalog_prices(product_id,country_code,currency,amount_minor,billing_period,cohort,active)
select 'fuego_gold','PE','USD',1299,'month','launch-2026',true
where not exists(select 1 from public.catalog_prices where product_id='fuego_gold' and country_code='PE' and currency='USD' and cohort='launch-2026');
insert into public.catalog_prices(product_id,country_code,currency,amount_minor,billing_period,cohort,active)
select 'boost_30m','PE','USD',199,null,'launch-2026',true
where not exists(select 1 from public.catalog_prices where product_id='boost_30m' and country_code='PE' and currency='USD' and cohort='launch-2026');
insert into public.catalog_prices(product_id,country_code,currency,amount_minor,billing_period,cohort,active)
select 'superfuego_5','PE','USD',399,null,'launch-2026',true
where not exists(select 1 from public.catalog_prices where product_id='superfuego_5' and country_code='PE' and currency='USD' and cohort='launch-2026');

create or replace function public.start_catalog_purchase(p_product text,p_currency text,p_amount_minor integer,p_provider text default 'segpay')
returns uuid language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();v_id uuid;begin
 if u is null then raise exception 'not_authenticated';end if;
 if p_provider<>'segpay' then raise exception 'unsupported_provider';end if;
 if not exists(select 1 from public.catalog_products cp where cp.id=p_product and cp.active) then raise exception 'invalid_product';end if;
 if not exists(select 1 from public.catalog_prices pr where pr.product_id=p_product and pr.country_code='PE' and pr.active and(pr.valid_to is null or pr.valid_to>now())and pr.currency=p_currency and pr.amount_minor=p_amount_minor)then raise exception 'invalid_price';end if;
 insert into public.purchases(user_id,product_id,provider,amount_minor,currency,status,idempotency_key)
 values(u,p_product,p_provider,p_amount_minor,p_currency,'pending','store:'||u::text||':'||p_product||':'||extract(epoch from clock_timestamp())::bigint::text)
 returning id into v_id;return v_id;
end;$$;
revoke all on function public.start_catalog_purchase(text,text,integer,text) from public,anon;
grant execute on function public.start_catalog_purchase(text,text,integer,text) to authenticated;

create or replace function public.fulfill_paid_catalog_purchase(p_purchase uuid,p_provider_payment text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.purchases%rowtype;cp public.catalog_products%rowtype;credits integer;begin
 select*into p from public.purchases where id=p_purchase for update;if not found then raise exception 'purchase_not_found';end if;
 if p.status='paid' then return jsonb_build_object('ok',true,'alreadyPaid',true);end if;
 if p.status<>'pending' then raise exception 'purchase_not_pending';end if;
 select*into cp from public.catalog_products where id=p.product_id and active;if not found then raise exception 'product_unavailable';end if;
 update public.purchases set status='paid',provider_payment_id=p_provider_payment,updated_at=now()where id=p.id;
 if cp.kind='boost' then credits:=coalesce((cp.entitlements->>'boost_credits')::integer,(cp.entitlements->>'boost_minutes')::integer/30,1);insert into public.entitlement_ledger(user_id,entitlement,delta,source_type,source_id)values(p.user_id,'boost_credits',greatest(credits,1),'purchase',p.id::text);
 elsif cp.kind='superfuego_pack' then credits:=coalesce((cp.entitlements->>'superfuego_credits')::integer,5);insert into public.entitlement_ledger(user_id,entitlement,delta,source_type,source_id)values(p.user_id,'superfuego_credits',greatest(credits,1),'purchase',p.id::text);
 end if;
 return jsonb_build_object('ok',true,'kind',cp.kind,'productId',cp.id);
end;$$;
revoke all on function public.fulfill_paid_catalog_purchase(uuid,text) from public,anon,authenticated;
grant execute on function public.fulfill_paid_catalog_purchase(uuid,text) to service_role;
