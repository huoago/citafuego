import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read=(path:string)=>fs.readFileSync(path,'utf8');

test('root layout uses semantic shell styles and avoids v22 patch files',()=>{
  const layout=read('src/app/layout.tsx');
  assert.match(layout,/import '\.\/site-shell\.css';/);
  assert.doesNotMatch(layout,/profile-directory\.css/);
  assert.doesNotMatch(layout,/v22-global-navigation-profile\.css/);
  assert.doesNotMatch(layout,/v22-sticky-offsets\.css/);
  assert.equal(fs.existsSync('src/app/v22-global-navigation-profile.css'),false);
  assert.equal(fs.existsSync('src/app/v22-sticky-offsets.css'),false);
});

test('directory profile stylesheet is route-scoped instead of paid on every page',()=>{
  const layout=read('src/app/(app)/perfil/[userId]/layout.tsx');
  assert.match(layout,/import '\.\.\/\.\.\/\.\.\/profile-directory\.css';/);
});

test('site shell centralizes sticky offsets with reusable navigation height',()=>{
  const css=read('src/app/site-shell.css');
  assert.match(css,/--cf-site-nav-height:64px/);
  assert.match(css,/top:var\(--cf-site-nav-height\)!important/);
  assert.match(css,/@media\(max-width:620px\).*--cf-site-nav-height:58px/s);
});

test('directory profile prioritizes contact and keeps public WhatsApp opt-in',()=>{
  const page=read('src/app/(app)/perfil/[userId]/page.tsx');
  const contact=page.indexOf('id="profile-contact"');
  const bio=page.indexOf('<p className="pkBio">');
  assert.ok(contact>=0,'profile contact section must exist');
  assert.ok(bio>contact,'contact must appear before long-form bio');
  assert.match(page,/bundle\.whatsapp\?/);
  assert.match(page,/Número publicado voluntariamente por esta persona/);
  assert.match(page,/pkMobileActions/);
  assert.match(page,/Chat CitaFuego/);
});

test('profile presentation has a mobile-only quick contact toolbar',()=>{
  const css=read('src/app/profile-directory.css');
  assert.match(css,/\.pkMobileActions\{display:none\}/);
  assert.match(css,/@media\(max-width:620px\).*\.pkMobileActions\{position:fixed/s);
  assert.match(css,/bottom:calc\(68px \+ env\(safe-area-inset-bottom\)\)/);
});
