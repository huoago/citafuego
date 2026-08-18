import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

test('V6 public navigation reduces choices without deleting feature routes',()=>{
  const nav=read('src/components/public/PublicFeatureNav.tsx');
  const home=read('src/app/page.tsx');
  assert.match(nav,/Cómo funciona/);
  assert.match(nav,/Seguridad/);
  assert.match(nav,/Comunidad/);
  assert.doesNotMatch(nav,/publicFeatures\.map/);
  assert.match(home,/essentialSlugs/);
  assert.match(home,/Lo esencial para conectar/);
});

test('V6 registration explains the different email and social auth paths honestly',()=>{
  const register=read('src/app/(auth)/registro/page.tsx');
  const complete=read('src/app/(auth)/registro/completar/page.tsx');
  const switcher=read('src/components/auth/auth-method-switcher.tsx');
  assert.match(register,/Con Email confirmas edad y consentimientos aquí/);
  assert.match(register,/segundo y último paso/);
  assert.match(switcher,/Paso 1 de 2/);
  assert.match(complete,/Paso 2 de 2/);
});

test('V6 segmented auth follows keyboard tab interaction conventions',()=>{
  const switcher=read('src/components/auth/auth-method-switcher.tsx');
  for(const key of ['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'])assert.match(switcher,new RegExp(key));
  assert.match(switcher,/aria-orientation="horizontal"/);
  assert.match(switcher,/tabIndex=\{method===item\?0:-1\}/);
});

test('V6 chat list uses human recency and distinguishes a fresh Match',()=>{
  const chat=read('src/app/(app)/chats/page.tsx');
  assert.match(chat,/friendlyTime/);
  assert.match(chat,/Ahora/);
  assert.match(chat,/Ayer/);
  assert.match(chat,/Nuevo Match/);
  assert.match(chat,/dateTime=\{row\.last_message_at\}/);
  assert.doesNotMatch(chat,/toLocaleDateString\('es-PE',\{day:'2-digit',month:'2-digit'\}\)/);
});
