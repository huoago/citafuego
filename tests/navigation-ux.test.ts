import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('public CTAs use dedicated routes instead of hash scrolling',()=>{
  const home=read('src/app/page.tsx');
  const nav=read('src/components/public/PublicFeatureNav.tsx');
  const features=read('src/lib/public-features.ts');
  const source=`${home}\n${nav}\n${features}`;
  assert.equal(source.includes('href="#'),false);
  for(const route of ['/registro','/iniciar-sesion','/explorar','/safety','/swipe','/chat-privado','/random-connect']) assert.equal(source.includes(route),true,`missing ${route}`);
});

test('public product routes have their own screens',()=>{
  for(const page of ['src/app/explorar/page.tsx','src/app/como-funciona/page.tsx','src/app/safety/page.tsx']) assert.equal(existsSync(new URL(`../${page}`,import.meta.url)),true,`${page} must exist`);
});

test('authenticated tab bar keeps five stable Social V2 destinations and active state',()=>{
  const source=read('src/components/bottom-nav.tsx');
  for(const route of ['/descubrir','/comunidad','/matches','/chats','/perfil']) assert.equal(source.includes(`href: '${route}'`),true,`missing ${route}`);
  assert.equal(source.includes("href: '/likes'"),false);
  assert.equal(source.includes('aria-current'),true);
  assert.equal(source.includes('usePathname'),true);
});

test('community consolidates creation stories interests and conversation feed',()=>{
  const source=read('src/app/(app)/comunidad/page.tsx');
  for(const route of ['/stories','/stories/nuevo','/blog/nuevo','/para-ti']) assert.equal(source.includes(route),true,`missing ${route}`);
  assert.match(source,/Intereses que conectan/);
  assert.match(source,/BlogCard/);
});

test('likes remain one tap from matches even after tab-bar simplification',()=>{
  const matches=read('src/app/(app)/matches/page.tsx');
  const likes=read('src/app/(app)/likes/page.tsx');
  assert.match(matches,/href="\/likes"/);
  assert.match(likes,/href="\/matches"/);
});

test('premium cards do not expose dead disabled purchase buttons',()=>{
  const source=read('src/app/(app)/premium/page.tsx');
  assert.equal(source.includes('disabled'),false);
  assert.equal(source.includes('/premium/beneficios?plan='),true);
  assert.equal(existsSync(new URL('../src/app/(app)/premium/beneficios/page.tsx',import.meta.url)),true);
});

test('profile decision buttons execute real interaction handlers',()=>{
  const source=read('src/components/discover-deck.tsx');
  for(const action of ["rewind()","decide('pass')","decide('superfuego')","decide('like')"]) assert.equal(source.includes(action),true,`missing interaction ${action}`);
  assert.match(source,/dy<=-76/);
  assert.match(source,/Ver perfil completo/);
});

test('incoming likes can be accepted or declined',()=>{
  const source=read('src/components/likes-grid.tsx');
  assert.equal(source.includes("respond(row.profileId, 'pass')"),true);
  assert.equal(source.includes("respond(row.profileId, 'like')"),true);
  assert.equal(source.includes('/api/interactions'),true);
});

test('matched chat has a durable synchronized screen',()=>{
  const page=read('src/app/(app)/chats/[conversationId]/page.tsx');
  assert.match(page,/ServerChat/);
  assert.match(page,/from\('messages'\)/);
  assert.equal(existsSync(new URL('../src/components/chat/server-chat.tsx',import.meta.url)),true);
});
