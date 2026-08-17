import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

test('creator monetization remains fail-closed',()=>{
  const gate=read('supabase/migrations/052_temporarily_close_creator_program.sql');
  assert.match(gate,/revoke/i);
});

test('device-only chat enforcement remains present',()=>{
  const migration=read('supabase/migrations/034_device_only_chat.sql');
  assert.match(migration,/Message content must never be persisted/i);
  assert.match(migration,/drop table if exists public\.random_chat_messages/i);
});

test('random matching keeps text voice and video modes',()=>{
  const lobby=read('src/components/random/random-lobby.tsx');
  assert.match(lobby,/mode:'text'/);
  assert.match(lobby,/mode:'voice'/);
  assert.match(lobby,/mode:'video'/);
});

test('release readiness endpoint reports privacy and creator gates',()=>{
  const route=read('src/app/api/release-readiness/route.ts');
  assert.match(route,/creatorProgram: 'closed'/);
  assert.match(route,/chatContentPersistence: 'device-only'/);
  assert.match(route,/externalProviderPolicy: 'fail-closed'/);
});

test('external provider readiness document prohibits simulated success',()=>{
  const doc=read('docs/EXTERNAL_PROVIDER_READINESS.md');
  assert.match(doc,/No fake success state/i);
});
