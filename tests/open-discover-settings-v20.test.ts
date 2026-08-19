import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const appLayout=readFileSync('src/app/(app)/layout.tsx','utf8');
const discover=readFileSync('src/app/(app)/descubrir/page.tsx','utf8');
const shell=readFileSync('src/components/mobile-shell.tsx','utf8');
const topNav=readFileSync('src/components/app-top-nav.tsx','utf8');
const profile=readFileSync('src/app/(app)/perfil/page.tsx','utf8');
const settings=readFileSync('src/app/(app)/ajustes/page.tsx','utf8');
const settingsClient=readFileSync('src/components/settings/settings-client.tsx','utf8');
const api=readFileSync('src/app/api/ui/preferences/route.ts','utf8');
const migration=readFileSync('supabase/migrations/080_open_discovery_ui_security_hardening.sql','utf8');

test('onboarding profile is no longer redirected away from the app or Discover',()=>{
  assert.doesNotMatch(appLayout,/p\.status==='onboarding'\)redirect\('\/onboarding'/);
  assert.match(appLayout,/restricted','suspended','banned/);
  assert.match(appLayout,/!privateRow\)redirect\('\/registro\/completar'/);
  assert.doesNotMatch(discover,/Tu perfil debe estar activo antes de entrar a Descubrir/);
  assert.match(discover,/no necesitas activar un perfil para entrar/);
  assert.match(migration,/unable_to_remove_discover_candidate_activation_gate/);
  assert.match(migration,/unable_to_remove_discover_page_activation_gate/);
});

test('top dating navigation is shared across logged-in app pages',()=>{
  assert.match(shell,/<AppTopNav\/>/);
  for(const route of ['/descubrir','/comunidad','/azar','/likes','/matches','/chats','/citas'])assert.match(topNav,new RegExp(route.replace('/','\\/')));
});

test('profile exposes functional settings and configurable modules',()=>{
  assert.match(profile,/href="\/ajustes"/);
  assert.match(profile,/profilePersonalGrid/);
  assert.match(profile,/module_layout/);
  assert.match(settings,/Salir de esta cuenta/);
  assert.match(settings,/action="\/api\/auth\/logout"/);
  assert.match(settingsClient,/draggable/);
  assert.match(settingsClient,/colSpan/);
  assert.match(settingsClient,/rowSpan/);
  assert.match(settingsClient,/custom_background/);
  assert.match(api,/user_ui_preferences/);
  assert.match(api,/auth\.getUser/);
});

test('security hardening makes RPC-only tables explicit and locks trigger functions',()=>{
  for(const table of ['account_auth_rate_limits','account_usernames','ad_delivery_requests','blog_comments','blog_likes','blog_shares','conversation_reads','private_album_grants','private_album_items','private_album_views','private_albums','push_subscriptions','user_rate_limit_buckets']){
    assert.match(migration,new RegExp(table));
  }
  assert.match(migration,/deny_direct_access_v20/);
  assert.match(migration,/revoke all on table/);
  for(const fn of ['enforce_interaction_trust','enforce_message_rate_limit','handle_citafuego_new_user','notify_interaction','notify_match','sync_content_topic_vector'])assert.match(migration,new RegExp(`revoke all on function public\\.${fn}`));
});
