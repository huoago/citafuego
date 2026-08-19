import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const migration=readFileSync('supabase/migrations/079_optional_trust_core_features.sql','utf8');
const randomPage=readFileSync('src/app/(app)/azar/page.tsx','utf8');
const lobby=readFileSync('src/components/random/random-lobby.tsx','utf8');
const likes=readFileSync('src/components/likes-grid.tsx','utf8');

test('Random requires an active adult profile, not verification',()=>{
  const fn=migration.slice(migration.indexOf('create or replace function public.join_random_match'));
  assert.match(fn,/status='active'/);
  assert.doesNotMatch(fn,/verification_badge=true/);
  assert.doesNotMatch(fn,/verified_profile_required/);
  assert.match(fn,/blocks b/);
  assert.match(randomPage,/sin exigir fotos ni verificación/);
  assert.match(lobby,/con o sin fotos o verificación/);
});

test('received Likes include active users even without approved photos',()=>{
  const fn=migration.slice(migration.indexOf('create or replace function public.get_who_likes_me'),migration.indexOf('create or replace function public.join_random_match'));
  assert.match(fn,/left join lateral/);
  assert.doesNotMatch(fn,/photo\.storage_path is not null/);
  assert.match(fn,/p\.status='active'/);
  assert.match(fn,/blocks b/);
});

test('Likes UI renders a neutral placeholder and layered trust mark',()=>{
  assert.match(likes,/profile-placeholder\.svg/);
  assert.match(likes,/<TrustMark hasPhoto=\{Boolean\(row\.imageUrl\)\} verified=\{row\.verified\}/);
  assert.doesNotMatch(likes,/row\.verified \? '✓'/);
});
