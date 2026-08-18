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
  assert.match(source,/<svg/);
});

test('authenticated header only keeps notifications and creation as global utilities',()=>{
  const source=read('src/components/mobile-shell.tsx');
  assert.match(source,/href="\/notificaciones"/);
  assert.match(source,/href="\/blog\/nuevo"/);
  assert.match(source,/href="\/stories\/nuevo"/);
  assert.doesNotMatch(source,/homeAction/);
  assert.doesNotMatch(source,/href="\/azar"/);
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

test('subscription membership is hidden while its backend stays feature-flagged',()=>{
  const shell=read('src/components/mobile-shell.tsx');
  const profile=read('src/app/(app)/perfil/page.tsx');
  const discover=read('src/components/discover-deck.tsx');
  const premiumLayout=read('src/app/(app)/premium/layout.tsx');
  const checkout=read('src/app/api/premium/checkout/route.ts');
  assert.doesNotMatch(shell,/href="\/premium"/);
  assert.doesNotMatch(profile,/href="\/premium"/);
  assert.doesNotMatch(discover,/\/premium\/filtros/);
  assert.match(premiumLayout,/isPremiumEnabled/);
  assert.match(checkout,/feature_unavailable/);
});

test('discovery uses horizontal decisions only and lets the user choose after a Match',()=>{
  const source=read('src/components/discover-deck.tsx');
  for(const action of ["rewind()","decide('pass')","decide('like')"]) assert.equal(source.includes(action),true,`missing interaction ${action}`);
  assert.doesNotMatch(source,/decide\('superfuego'\)/);
  assert.doesNotMatch(source,/Fuego Plus|Fuego Gold/);
  assert.doesNotMatch(source,/dy<=-76|dy>=76/);
  assert.match(source,/Math\.abs\(dx\)>=72/);
  assert.match(source,/Seguir descubriendo/);
  assert.match(source,/Enviar mensaje/);
  assert.match(source,/Ver perfil completo/);
});

test('main profile keeps commercial tools in a secondary screen',()=>{
  const profile=read('src/app/(app)/perfil/page.tsx');
  const more=read('src/app/(app)/perfil/mas/page.tsx');
  assert.match(profile,/Más ajustes y herramientas/);
  for(const route of ['/boost','/tienda','/anunciantes']) assert.equal(profile.includes(`href="${route}"`),false,`${route} should not be on main profile`);
  for(const route of ['/boost','/tienda','/anunciantes']) assert.equal(more.includes(`href="${route}"`),true,`${route} missing from secondary settings`);
  assert.match(profile,/Completar perfil/);
  assert.match(profile,/Preguntas de perfil/);
  assert.match(profile,/Seguridad para citas/);
});

test('reporting offers immediate blocking as a separate user choice',()=>{
  const source=read('src/components/safety/safety-actions.tsx');
  assert.match(source,/Gracias por avisarnos/);
  assert.match(source,/Bloquear también/);
  assert.match(source,/setPostReport\(true\)/);
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
