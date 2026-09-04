import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

test('mobile admin exposes every permitted module through an explicit responsive menu',()=>{
  const nav=read('src/components/admin/admin-nav.tsx');
  const css=read('src/app/admin/admin-mobile.css');
  const layout=read('src/app/admin/layout.tsx');
  assert.match(nav,/data-admin-mobile-nav/);
  assert.match(nav,/<details className="adminMobileNav"/);
  assert.match(nav,/visibleGroups\.map\(group=>/);
  assert.match(nav,/group\.items\.map\(item=>/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/\.adminSidebarDesktop\{display:none!important\}/);
  assert.match(css,/\.adminMobileNav\{display:block!important/);
  assert.match(css,/max-height:min\(68svh,620px\)/);
  assert.match(layout,/admin-mobile\.css/);
});

test('global account shell reflects the live session instead of always looking logged out',()=>{
  const shell=read('src/components/global-site-nav.tsx');
  const actions=read('src/components/global-account-actions.tsx');
  const route=read('src/app/api/auth/session/route.ts');
  assert.match(shell,/GlobalAccountActions/);
  assert.match(actions,/fetch\('\/api\/auth\/session'/);
  assert.match(actions,/credentials:'same-origin'/);
  assert.match(actions,/data-account-state="authenticated"/);
  assert.match(actions,/href="\/perfil"/);
  assert.match(actions,/href="\/logout"/);
  assert.match(actions,/state\.admin\?<Link href="\/admin"/);
  assert.match(route,/auth\.getClaims\(\)/);
  assert.match(route,/private, no-store/);
  assert.match(route,/vary':'Cookie/);
});

test('account login verifies that its cookie-backed session is observable before redirecting',()=>{
  const form=read('src/components/auth/account-auth-form.tsx');
  assert.match(form,/credentials:'same-origin',cache:'no-store'/);
  assert.match(form,/fetch\('\/api\/auth\/session'/);
  assert.match(form,/session\.authenticated!==true/);
  assert.match(form,/window\.location\.replace/);
  assert.doesNotMatch(form,/window\.location\.assign/);
});
