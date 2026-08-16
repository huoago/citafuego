-- Admin operations for recommendation experiments, ad networks/placements/campaigns.

create or replace function public.admin_set_recommendation_experiment(p_key text,p_status text,p_allocation jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if not public.admin_has_any_role(array['super_admin','analyst']) then raise exception 'forbidden'; end if;
  if p_status not in ('draft','running','paused','completed') then raise exception 'invalid_status'; end if;
  if not exists(select 1 from public.recommendation_experiments where experiment_key=p_key) then raise exception 'experiment_not_found'; end if;
  update public.recommendation_experiments set status=p_status,allocation=coalesce(p_allocation,allocation),started_at=case when p_status='running' and started_at is null then now() else started_at end,ended_at=case when p_status='completed' then now() else null end,updated_at=now() where experiment_key=p_key;
  return jsonb_build_object('ok',true,'experiment',p_key,'status',p_status);
end; $$;
revoke all on function public.admin_set_recommendation_experiment(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_set_recommendation_experiment(text,text,jsonb) to authenticated;

create or replace function public.admin_upsert_ad_network(p_provider_slug text,p_display_name text,p_mode text,p_enabled boolean,p_public_config jsonb default '{}'::jsonb,p_secret_env_ref text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare nid bigint;
begin
  if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
  if p_mode not in ('direct','external') then raise exception 'invalid_mode'; end if;
  if trim(coalesce(p_provider_slug,''))='' or trim(coalesce(p_display_name,''))='' then raise exception 'invalid_network'; end if;
  insert into public.ad_networks(provider_slug,display_name,mode,enabled,public_config,secret_env_ref,updated_at)
  values(lower(trim(p_provider_slug)),trim(p_display_name),p_mode,coalesce(p_enabled,false),coalesce(p_public_config,'{}'::jsonb),nullif(trim(coalesce(p_secret_env_ref,'')),''),now())
  on conflict(provider_slug) do update set display_name=excluded.display_name,mode=excluded.mode,enabled=excluded.enabled,public_config=excluded.public_config,secret_env_ref=excluded.secret_env_ref,updated_at=now()
  returning id into nid;
  return jsonb_build_object('ok',true,'networkId',nid);
end; $$;
revoke all on function public.admin_upsert_ad_network(text,text,text,boolean,jsonb,text) from public,anon,authenticated;
grant execute on function public.admin_upsert_ad_network(text,text,text,boolean,jsonb,text) to authenticated;

create or replace function public.admin_configure_ad_placement(p_slug text,p_enabled boolean,p_external_slot_key text default null,p_max_per_session integer default 3) returns jsonb
language plpgsql security definer set search_path=public as $$;
begin
  if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
  if p_max_per_session<0 or p_max_per_session>20 then raise exception 'invalid_frequency'; end if;
  update public.ad_placements set enabled=p_enabled,external_slot_key=nullif(trim(coalesce(p_external_slot_key,'')),''),max_per_session=p_max_per_session,updated_at=now() where slug=p_slug;
  if not found then raise exception 'placement_not_found'; end if;
  return jsonb_build_object('ok',true,'placement',p_slug);
end; $$;
revoke all on function public.admin_configure_ad_placement(text,boolean,text,integer) from public,anon,authenticated;
grant execute on function public.admin_configure_ad_placement(text,boolean,text,integer) to authenticated;

create or replace function public.admin_create_ad_campaign(
  p_advertiser text,p_name text,p_destination_url text,p_budget_usd_micros bigint,p_cpm_usd_micros bigint,p_cpc_usd_micros bigint,
  p_placement_slugs text[],p_headline text,p_body text default null,p_image_url text default null,p_cta text default 'Ver más',p_starts_at timestamptz default null,p_ends_at timestamptz default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare nid bigint; cid bigint; crid bigint;
begin
  if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
  if trim(coalesce(p_advertiser,''))='' or trim(coalesce(p_name,''))='' or trim(coalesce(p_headline,''))='' then raise exception 'invalid_campaign'; end if;
  if p_budget_usd_micros<0 or p_cpm_usd_micros<0 or p_cpc_usd_micros<0 then raise exception 'invalid_pricing'; end if;
  select id into nid from public.ad_networks where provider_slug='citafuego_direct' and enabled=true;
  if nid is null then raise exception 'direct_network_unavailable'; end if;
  insert into public.ad_campaigns(network_id,advertiser_name,name,status,starts_at,ends_at,budget_usd_micros,cpm_usd_micros,cpc_usd_micros,destination_url,created_by)
  values(nid,trim(p_advertiser),trim(p_name),'draft',p_starts_at,p_ends_at,p_budget_usd_micros,p_cpm_usd_micros,p_cpc_usd_micros,nullif(trim(coalesce(p_destination_url,'')),''),auth.uid()) returning id into cid;
  insert into public.ad_campaign_placements(campaign_id,placement_id) select cid,p.id from public.ad_placements p where p.slug=any(coalesce(p_placement_slugs,'{}'::text[]));
  if not exists(select 1 from public.ad_campaign_placements where campaign_id=cid) then raise exception 'no_valid_placements'; end if;
  insert into public.ad_creatives(campaign_id,headline,body,image_url,call_to_action) values(cid,trim(p_headline),nullif(trim(coalesce(p_body,'')),''),nullif(trim(coalesce(p_image_url,'')),''),coalesce(nullif(trim(coalesce(p_cta,'')),''),'Ver más')) returning id into crid;
  return jsonb_build_object('ok',true,'campaignId',cid,'creativeId',crid,'status','draft');
end; $$;
revoke all on function public.admin_create_ad_campaign(text,text,text,bigint,bigint,bigint,text[],text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_create_ad_campaign(text,text,text,bigint,bigint,bigint,text[],text,text,text,text,timestamptz,timestamptz) to authenticated;

create or replace function public.admin_set_ad_campaign_status(p_campaign bigint,p_status text) returns jsonb
language plpgsql security definer set search_path=public as $$;
begin
  if not public.admin_has_any_role(array['super_admin','finance']) then raise exception 'forbidden'; end if;
  if p_status not in ('draft','active','paused','completed') then raise exception 'invalid_status'; end if;
  update public.ad_campaigns set status=p_status,updated_at=now() where id=p_campaign;
  if not found then raise exception 'campaign_not_found'; end if;
  return jsonb_build_object('ok',true,'campaignId',p_campaign,'status',p_status);
end; $$;
revoke all on function public.admin_set_ad_campaign_status(bigint,text) from public,anon,authenticated;
grant execute on function public.admin_set_ad_campaign_status(bigint,text) to authenticated;
