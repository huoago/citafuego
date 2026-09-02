import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const payments=readFileSync('src/app/admin/payments/page.tsx','utf8');
const ads=readFileSync('src/app/admin/ads/page.tsx','utf8');
const nav=readFileSync('src/components/admin/admin-nav.tsx','utf8');
const integrations=readFileSync('src/components/admin/provider-integrations-client.tsx','utf8');

test('admin payment center exposes real orders, subscriptions, provider readiness and commercial gate',()=>{
  for(const token of ["from('purchases')","from('subscriptions')",'admin_get_provider_status_v2','PAYMENTS_ENABLED','/admin/integrations','/admin/memberships'])assert.match(payments,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(payments,/provider_payment_id/);
  assert.match(payments,/provider_subscription_id/);
  assert.match(payments,/no simula operaciones financieras/i);
});

test('admin advertising center manages networks, placements, direct campaigns and advertiser queue behind gate',()=>{
  for(const token of ["from('ad_networks')","from('ad_placements')","from('ad_campaigns')","from('advertiser_accounts')","from('self_service_ad_campaigns')",'ADS_ENABLED','AdNetworkForm','AdCampaignForm','PlacementActions','CampaignStatusActions'])assert.match(ads,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(ads,/gate comercial/i);
});

test('commercial navigation and provider secrets remain role-separated and Vault-backed',()=>{
  assert.match(nav,/\/admin\/ads/);
  assert.match(nav,/\/admin\/payments/);
  assert.match(nav,/\/admin\/integrations/);
  assert.match(integrations,/Supabase Vault/);
  assert.match(integrations,/type="password"/);
  assert.doesNotMatch(integrations,/defaultValue=\{[^}]*secret/i);
});
