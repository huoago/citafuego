import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const layout=readFileSync(join(root,'src/app/layout.tsx'),'utf8');
const contrastCss=readFileSync(join(root,'src/app/v16-dark-theme-readability.css'),'utf8');
const homeCss=readFileSync(join(root,'src/app/home.module.css'),'utf8');
const featureCss=readFileSync(join(root,'src/components/public/public-feature.module.css'),'utf8');

function channel(v:number){const s=v/255;return s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4)}
function luminance(hex:string){const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16);const g=parseInt(h.slice(2,4),16);const b=parseInt(h.slice(4,6),16);return 0.2126*channel(r)+0.7152*channel(g)+0.0722*channel(b)}
function ratio(a:string,b:string){const x=luminance(a);const y=luminance(b);const hi=Math.max(x,y);const lo=Math.min(x,y);return (hi+0.05)/(lo+0.05)}

test('V16 readability stylesheet is loaded after prior visual layers',()=>{
  assert.match(layout,/\.\/v15-public-polish\.css';\nimport '\.\/v16-dark-theme-readability\.css'/);
});

test('onboarding navigation, optional help and interest choices have explicit readable text',()=>{
  assert.match(contrastCss,/\.stepRail button\{[^}]*color:#eee8ec!important/);
  assert.match(contrastCss,/\.onboardingCard small,[\s\S]*color:var\(--cf-readable-muted\)!important/);
  assert.match(contrastCss,/\.onboardingCard \.choice\{[^}]*color:#f6f0f3!important/);
  assert.match(contrastCss,/\.onboardingCard \.choice\.active\{[^}]*color:#fff!important/);
  assert.ok(ratio('#eee8ec','#21171a')>=4.5);
  assert.ok(ratio('#f6f0f3','#171012')>=4.5);
  assert.ok(ratio('#d0c7cd','#181010')>=4.5);
});

test('dark form placeholders stay readable',()=>{
  assert.match(contrastCss,/--cf-readable-placeholder:#aba1a8/);
  assert.match(contrastCss,/input::placeholder,textarea::placeholder/);
  assert.ok(ratio('#aba1a8','#0e090b')>=4.5);
});

test('landing and public feature pages no longer use known low-contrast greys',()=>{
  for(const legacy of ['#5f5b65','#77727d']) assert.doesNotMatch(homeCss,new RegExp(legacy,'i'));
  for(const legacy of ['#65616a','#77727d']) assert.doesNotMatch(featureCss,new RegExp(legacy,'i'));
  assert.match(homeCss,/\.footer\{[^}]*background:#171a21;color:#c7ccd3/);
  assert.ok(ratio('#c7ccd3','#171a21')>=4.5);
  assert.match(featureCss,/\.detail\{[^}]*color:#bbb4bd/);
});