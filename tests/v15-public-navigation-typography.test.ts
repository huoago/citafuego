import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

test('V15 public navigation exposes an explicit Inicio link everywhere',()=>{
  const nav=read('src/components/public/PublicFeatureNav.tsx');
  assert.match(nav,/\{href:'\/',label:'Inicio'\}/);
  assert.match(nav,/href="\/" className=\{styles\.brand\}/);
});

test('V15 safety uses the shared public navigation and explicit home return controls',()=>{
  const safety=read('src/app/safety/page.tsx');
  assert.match(safety,/PublicFeatureNav/);
  assert.match(safety,/Volver al inicio/);
  assert.match(safety,/href="\/"/);
  assert.doesNotMatch(safety,/className="legalPage"/);
});

test('V15 how-it-works leaves the legacy bright marketing surface',()=>{
  const page=read('src/app/como-funciona/page.tsx');
  const css=read('src/app/v15-public-polish.css');
  assert.match(page,/PublicFeatureNav/);
  assert.match(page,/v15HowShell/);
  assert.match(page,/Volver al inicio/);
  assert.doesNotMatch(page,/marketingPage|marketingHero|landingNav/);
  assert.match(css,/\.v15InfoShell\{[^}]*background:#08080b/);
  assert.match(css,/\.v15StepCard\{[^}]*background:#101015/);
});

test('directory home uses compact headings while public feature detail pages retain bounded typography',()=>{
  const home=read('src/app/page.tsx');
  const homeCss=read('src/app/home.module.css');
  const feature=read('src/components/public/PublicFeaturePage.tsx');
  const css=read('src/app/v15-public-polish.css');
  assert.match(home,/HomeDirectoryEnhancements/);
  assert.doesNotMatch(home,/HomeDirectoryControls|v15HomeHero/);
  assert.match(homeCss,/\.directoryHeader h1\{[^}]*font-size:30px/);
  assert.match(homeCss,/@media\(max-width:760px\)[\s\S]*\.directoryHeader h1\{font-size:25px/);
  assert.match(feature,/v15PublicFeatureHero/);
  assert.match(css,/v15PublicFeatureHero h1\{font-size:clamp\(34px,4\.5vw,58px\)!important/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*v15PublicFeatureHero h1\{font-size:34px!important/);
});

test('V15 polish stylesheet is loaded after earlier design layers',()=>{
  const layout=read('src/app/layout.tsx');
  assert.match(layout,/import '\.\/v15-public-polish\.css';/);
  assert.ok(layout.indexOf("./v15-public-polish.css")>layout.indexOf("./v14-onboarding-fixes.css"));
});
