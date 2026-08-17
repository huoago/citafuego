import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

test('private album finalization is server privileged and direct authenticated finalize is revoked',()=>{
  const route=read('src/app/api/private-albums/media/complete/route.ts');
  const migration=read('supabase/migrations/064_top_tier_post_review_hardening.sql');
  assert.match(route,/createServiceClient/);
  assert.doesNotMatch(route,/rpc\('finalize_private_album_upload'/);
  assert.match(migration,/revoke execute on function public\.finalize_private_album_upload\([^)]+\) from authenticated/i);
});

test('private album viewer storage access requires atomic consume then service-signed URL',()=>{
  const route=read('src/app/api/private-albums/items/[itemId]/view/route.ts');
  const migration=read('supabase/migrations/064_top_tier_post_review_hardening.sql');
  assert.match(route,/rpc\('consume_private_album_item'/);
  assert.match(route,/createServiceClient/);
  assert.match(migration,/private_albums_select_owner_only/);
  assert.doesNotMatch(migration,/public\.can_read_private_album_object\(name,auth\.uid\(\)\)/);
});

test('Veriff provider sessions are persisted through server service role',()=>{
  const route=read('src/app/api/identity/veriff/start/route.ts');
  assert.match(route,/createServiceClient/);
  assert.match(route,/admin\.from\('verification_sessions'\)\.insert/);
});

test('phone verification timestamp is derived from Auth and synchronized by server role',()=>{
  const route=read('src/app/api/security/phone/status/route.ts');
  assert.match(route,/createServiceClient/);
  assert.match(route,/phone_confirmed_at/);
  assert.match(route,/admin\.from\('user_private'\)\.update\(\{phone_verified_at:user\.phone_confirmed_at\}\)/);
});

test('store entitlement reversals are purchase-level idempotent',()=>{
  const migration=read('supabase/migrations/064_top_tier_post_review_hardening.sql');
  assert.match(migration,/prevent_duplicate_store_reversal/);
  assert.match(migration,/source_type in \('refunded','chargeback'\)/);
  assert.match(migration,/e\.source_id=new\.source_id/);
});

test('Date Safety does not rewrite finalized proposal state',()=>{
  const migration=read('supabase/migrations/064_top_tier_post_review_hardening.sql');
  assert.match(migration,/if d\.status <> 'proposed' then raise exception 'proposal_finalized'/i);
});

test('Turnstile is remounted after rejected registration',()=>{
  const form=read('src/components/auth/register-form.tsx');
  assert.match(form,/challengeKey/);
  assert.match(form,/setChallengeKey\(key=>key\+1\)/);
  assert.match(form,/<TurnstileField key=\{challengeKey\}/);
});
