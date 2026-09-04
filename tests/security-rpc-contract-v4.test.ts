import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const migration=readFileSync('supabase/migrations/20260904144311_security_contract_hardening_v4.sql','utf8');
const wrapperMigration=readFileSync('supabase/migrations/20260904153635_security_definer_wrapper_minimization_v5.sql','utf8');

const publicFlags=[
  'ACCOUNT_LOGIN_ENABLED',
  'EMAIL_LOGIN_ENABLED',
  'EMAIL_REGISTRATION_ENABLED',
  'GOOGLE_LOGIN_ENABLED',
  'BLOG_MEDIA_ENABLED',
  'STORY_MEDIA_ENABLED',
];

const denyPolicies=[
  'account_deletion_jobs_direct_clients_denied',
  'admin_membership_grants_direct_clients_denied',
  'admin_operation_settings_direct_clients_denied',
  'membership_plans_direct_clients_denied',
  'site_settings_direct_clients_denied',
];

const coreRpcSignatures=[
  'public.get_my_matches(integer)',
  'public.get_discover_page_v3(integer,integer)',
  'public.get_my_date_proposals()',
  'public.get_private_albums()',
  'public.get_my_chat_unread_counts()',
  'public.get_who_likes_me(integer,integer)',
  'public.admin_get_monetization_metrics(integer)',
  'public.admin_get_provider_config_status()',
];

test('public operational flags use an exact non-secret allowlist and invoker RPC',()=>{
  for(const key of publicFlags) assert.match(migration,new RegExp(`'${key}'`));
  assert.match(migration,/create table if not exists public\.public_operational_flags/);
  assert.match(migration,/grant select on table public\.public_operational_flags to anon, authenticated/);
  assert.match(migration,/create or replace function public\.public_feature_enabled\(p_key text\)[\s\S]*?security invoker/i);
  assert.doesNotMatch(migration,/create or replace function public\.public_feature_enabled\(p_key text\)[\s\S]{0,180}?security definer/i);
});

test('public flag synchronization stays internal-only',()=>{
  assert.match(migration,/create or replace function public\.sync_public_operational_flag\(\)[\s\S]*?security definer/i);
  assert.match(migration,/revoke all on function public\.sync_public_operational_flag\(\) from public, anon, authenticated/i);
  assert.match(migration,/create trigger feature_flags_sync_public_operational/);
});

test('backend-only RLS tables have explicit restrictive deny-all policies',()=>{
  for(const policy of denyPolicies){
    assert.match(migration,new RegExp(`create policy ${policy}[\\s\\S]*?as restrictive for all to anon,authenticated[\\s\\S]*?using\\(false\\) with check\\(false\\)`,'i'));
  }
});

test('historically broken core RPCs are pinned to authenticated and never anon',()=>{
  for(const signature of coreRpcSignatures){
    const escaped=signature.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    assert.match(migration,new RegExp(`revoke execute on function ${escaped} from public,anon;[\\s\\S]*?grant execute on function ${escaped} to authenticated;`,'i'));
  }
});

test('compatibility-only blog comment wrapper no longer runs as SECURITY DEFINER',()=>{
  assert.match(wrapperMigration,/alter function public\.add_blog_comment\(uuid,text\) security invoker;/i);
  assert.doesNotMatch(wrapperMigration,/security definer/i);
});
