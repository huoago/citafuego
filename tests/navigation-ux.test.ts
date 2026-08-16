import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('public CTAs use dedicated routes instead of hash scrolling', () => {
  const source = read('src/app/page.tsx');
  assert.equal(source.includes('href="#'), false);
  for (const route of ['/registro', '/iniciar-sesion', '/explorar', '/como-funciona', '/seguridad']) {
    assert.equal(source.includes(`href="${route}"`), true, `missing ${route}`);
  }
});

test('public product routes have their own screens', () => {
  for (const page of ['src/app/explorar/page.tsx', 'src/app/como-funciona/page.tsx']) {
    assert.equal(existsSync(new URL(`../${page}`, import.meta.url)), true, `${page} must exist`);
  }
});

test('authenticated bottom navigation has five dedicated destinations and active state', () => {
  const source = read('src/components/bottom-nav.tsx');
  for (const route of ['/descubrir', '/matches', '/likes', '/chats', '/perfil']) {
    assert.equal(source.includes(`href: '${route}'`), true, `missing ${route}`);
  }
  assert.equal(source.includes('aria-current'), true);
  assert.equal(source.includes("usePathname"), true);
});

test('premium cards do not expose dead disabled purchase buttons', () => {
  const source = read('src/app/(app)/premium/page.tsx');
  assert.equal(source.includes('disabled'), false);
  assert.equal(source.includes('/premium/beneficios?plan='), true);
  assert.equal(existsSync(new URL('../src/app/(app)/premium/beneficios/page.tsx', import.meta.url)), true);
});

test('profile decision buttons all execute a real interaction handler', () => {
  const source = read('src/components/discover-deck.tsx');
  for (const action of ["rewind()", "decide('pass')", "decide('superfuego')", "decide('like')"]) {
    assert.equal(source.includes(action), true, `missing interaction ${action}`);
  }
});
