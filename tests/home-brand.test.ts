import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const page=readFileSync(join(root,'src/app/page.tsx'),'utf8');
const enhancements=readFileSync(join(root,'src/components/public/HomeDirectoryEnhancements.tsx'),'utf8');
const css=readFileSync(join(root,'src/app/home.module.css'),'utf8');
const features=readFileSync(join(root,'src/lib/public-features.ts'),'utf8');
const nav=readFileSync(join(root,'src/components/public/PublicFeatureNav.tsx'),'utf8');

const routes=['swipe','verificacion','chat-privado','random-connect','para-ti-info','stories-info','blog-info','album-privado','match-intelligence','seguridad-privacidad'];

test('homepage is a compact directory-first dating hub instead of a long marketing catalogue',()=>{
  assert.match(page,/CitaFuego en Lima/);
  assert.match(page,/Conoce personas reales con más contexto antes de conversar/);
  assert.match(page,/ni convertimos los perfiles en anuncios de servicios/);
  assert.match(page,/HomeDirectoryEnhancements/);
  assert.match(page,/data-preview-profile/);
  assert.doesNotMatch(page,/HomeDirectoryControls|publicFeatures\.map/);
  assert.equal(existsSync(join(root,'src/components/public/HomeDirectoryControls.tsx')),false,'legacy hydrated home directory must be removed');
  for(const oldSection of ['chatSection','randomSection','socialSection','albumSection','algorithmSection','premiumSection','privacyBanner','v15HomeHero']) assert.doesNotMatch(page,new RegExp(oldSection));
  assert.match(css,/\.profileGrid\{display:grid/);
  assert.match(css,/\.cityScroller\{[^}]*overflow:auto/);
});

test('homepage directory interactions stay small and server rendered',()=>{
  assert.doesNotMatch(enhancements,/['"]use client['"]/);
  assert.doesNotMatch(`${page}\n${enhancements}`,/from 'next\/link'/);
  assert.match(enhancements,/data-filter-group/);
  assert.match(enhancements,/data-preview-query/);
  assert.match(enhancements,/data-voice/);
  assert.match(enhancements,/navigator\.geolocation/);
  assert.match(enhancements,/data-view/);
  assert.match(enhancements,/data-reset-preview/);
});

test('top navigation exposes primary decisions while all public feature routes remain available',()=>{
  assert.doesNotMatch(nav,/publicFeatures\.map/);
  assert.match(nav,/Cómo funciona/);
  assert.match(nav,/Seguridad/);
  assert.match(nav,/Comunidad/);
  assert.match(page,/\/iniciar-sesion/);
  assert.match(page,/\/registro/);
  for(const route of routes) {
    assert.match(features,new RegExp(`slug: '/${route}'`));
    assert.equal(existsSync(join(root,`src/app/${route}/page.tsx`)),true,`missing /${route}`);
  }
  assert.doesNotMatch(features,/slug: '\/premium-info'/);
});

test('homepage labels illustrative preview and uses privacy and trust language instead of implementation jargon',()=>{
  assert.match(enhancements,/Vista previa/);
  assert.match(page,/Vista previa/);
  assert.doesNotMatch(`${page}\n${enhancements}`,/Demo · datos de ejemplo/);
  assert.match(page,/Solo adultos 18\+/);
  assert.match(enhancements,/distancia se muestra de forma aproximada para proteger la privacidad/);
  assert.match(page,/Bloqueo, denuncia, verificación y privacidad/);
  assert.doesNotMatch(`${page}\n${enhancements}`,/Chat P2P|Random, contenido social/);
  assert.match(features,/Entrega offline/);
  assert.match(features,/Historial sincronizado/);
  assert.match(features,/no pueden impedir capturas de pantalla/);
});

test('directory navigation remains responsive without hiding primary information',()=>{
  assert.match(css,/@media\(max-width:1000px\)/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(max-width:430px\)/);
  assert.match(css,/grid-template-columns:1fr/);
  const navCss=readFileSync(join(root,'src/components/public/public-feature.module.css'),'utf8');
  assert.match(navCss,/overflow-x:auto/);
});
