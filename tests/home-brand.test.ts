import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const page=readFileSync(join(root,'src/app/page.tsx'),'utf8');
const css=readFileSync(join(root,'src/app/home.module.css'),'utf8');
const features=readFileSync(join(root,'src/lib/public-features.ts'),'utf8');
const nav=readFileSync(join(root,'src/components/public/PublicFeatureNav.tsx'),'utf8');

const routes=['swipe','verificacion','chat-privado','random-connect','para-ti-info','stories-info','blog-info','album-privado','match-intelligence','premium-info','seguridad-privacidad'];

test('homepage is a compact feature hub instead of the previous long-scroll feature stack',()=>{
  assert.match(page,/Explora cada función/);
  assert.match(page,/featureRail/);
  for(const oldSection of ['chatSection','randomSection','socialSection','albumSection','algorithmSection','premiumSection','privacyBanner']) {
    assert.doesNotMatch(page,new RegExp(oldSection));
  }
  assert.match(css,/overflow-x:auto/);
  assert.match(css,/@media\(max-height:760px\)/);
});

test('top navigation exposes every homepage product feature on dedicated routes',()=>{
  assert.match(nav,/publicFeatures\.map/);
  for(const route of routes) {
    assert.match(features,new RegExp(`slug: '/${route}'`));
    assert.equal(existsSync(join(root,`src/app/${route}/page.tsx`)),true,`missing /${route}`);
  }
});

test('homepage keeps key product claims accurate and labels the profile preview as demo data',()=>{
  assert.match(page,/Demo · datos de ejemplo/);
  assert.match(page,/18\+/);
  assert.match(page,/Chat P2P/);
  assert.doesNotMatch(page,/Perfiles reales/);
  assert.match(features,/Sin persistencia del cuerpo del chat/);
  assert.match(features,/no pueden impedir capturas de pantalla/);
});

test('navigation hub remains responsive without hiding the feature menu',()=>{
  assert.match(css,/@media\(max-width:980px\)/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/grid-template-columns:1fr/);
  const navCss=readFileSync(join(root,'src/components/public/public-feature.module.css'),'utf8');
  assert.match(navCss,/overflow-x:auto/);
});
