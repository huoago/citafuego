-- Real-provider premium purchase flow and trust controls.

create or replace function public.start_premium_purchase(p_product text,p_currency text,p_amount_minor integer,p_provider text default 'segpay')
returns uuid language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); v_id uuid;begin
 if u is null then raise exception 'not_authenticated'; end if;
 if p_provider<>'segpay' then raise exception 'unsupported_provider'; end if;
 if not exists(select 1 from public.catalog_products cp where cp.id=p_product and cp.kind='subscription' and cp.active and coalesce(cp.tier,'free')<>'free') then raise exception 'invalid_product'; end if;
 if not exists(select 1 from public.catalog_prices pr where pr.product_id=p_product and pr.country_code='PE' and pr.active and (pr.valid_to is null or pr.valid_to>now()) and pr.currency=p_currency and pr.amount_minor=p_amount_minor) then raise exception 'invalid_price'; end if;
 insert into public.purchases(user_id,product_id,provider,amount_minor,currency,status,idempotency_key)
 values(u,p_product,p_provider,p_amount_minor,p_currency,'pending','premium:'||u::text||':'||p_product||':'||extract(epoch from clock_timestamp())::bigint::text)
 returning id into v_id;return v_id;
end; $$;
revoke all on function public.start_premium_purchase(text,text,integer,text) from public,anon;
grant execute on function public.start_premium_purchase(text,text,integer,text) to authenticated;

create or replace function public.set_my_trust_preferences(p_verified_only_likes boolean,p_verified_only_chat boolean,p_verified_only_random boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();begin
 if u is null then raise exception 'not_authenticated'; end if;
 insert into public.user_trust_preferences(user_id,verified_only_likes,verified_only_chat,verified_only_random,updated_at)
 values(u,coalesce(p_verified_only_likes,false),coalesce(p_verified_only_chat,false),coalesce(p_verified_only_random,true),now())
 on conflict(user_id) do update set verified_only_likes=excluded.verified_only_likes,verified_only_chat=excluded.verified_only_chat,verified_only_random=excluded.verified_only_random,updated_at=now();
 return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.set_my_trust_preferences(boolean,boolean,boolean) from public,anon;
grant execute on function public.set_my_trust_preferences(boolean,boolean,boolean) to authenticated;
