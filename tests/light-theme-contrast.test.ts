import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const layout=readFileSync('src/app/layout.tsx','utf8');
const trustTheme=readFileSync('src/app/v19-trust-theme.css','utf8');
const settingsTheme=readFileSync('src/app/v20-settings-personalization.css','utf8');
const controls=readFileSync('src/app/control-contrast-brand.css','utf8');
const shell=readFileSync('src/app/site-shell.css','utf8');
const profile=readFileSync('src/app/profile-detail.css','utf8');

function channel(v:number){const s=v/255;return s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4)}
function luminance(hex:string){const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16);const g=parseInt(h.slice(2,4),16);const b=parseInt(h.slice(4,6),16);return .2126*channel(r)+.7152*channel(g)+.0722*channel(b)}
function ratio(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}

test('browser chrome and canonical site surface are light',()=>{
  assert.match(layout,/themeColor:'#ffffff'/);
  assert.match(layout,/statusBarStyle:'default'/);
  assert.match(controls,/--bg:#fff/);
  assert.match(controls,/html,body\{background:#fff!important;color:#111827!important;color-scheme:light\}/);
});

test('logged-in workspace cannot switch back to unreadable dark backgrounds',()=>{
  assert.match(settingsTheme,/--user-app-bg:#ffffff/);
  assert.match(settingsTheme,/--user-app-text:#111827/);
  for(const name of ['fuego','oceano','bosque','uva'])assert.match(settingsTheme,new RegExp(`data-cita-theme="${name}"\\]\\{--user-app-bg:#fff`));
  assert.match(settingsTheme,/\.settingsRoute strong\{color:#111827\}/);
  assert.match(settingsTheme,/\.settingsRoute small\{color:#475569/);
});

test('primary and secondary text meet WCAG AA on white',()=>{
  assert.ok(ratio('#111827','#ffffff')>=7);
  assert.ok(ratio('#475569','#ffffff')>=4.5);
  assert.ok(ratio('#596579','#ffffff')>=4.5);
});

test('navigation, profile detail and admin review cards use readable light surfaces',()=>{
  assert.match(shell,/\.globalSiteNav\{[^}]*background:rgba\(255,255,255,.97\)/);
  assert.match(profile,/\.pkDecisionGrid>div\{[\s\S]*?background:#f8fafc/);
  assert.match(profile,/\.pkDecisionGrid strong\{[\s\S]*?color:#111827/);
  assert.match(controls,/\.adminReviewGrid article\{background:#fff!important;color:#20242c!important/);
  assert.match(controls,/\.reviewActions button\{background:#fff!important;color:#20242c!important/);
});

test('optional trust UI remains light with dark readable copy',()=>{
  assert.match(trustTheme,/--cf19-bg:#ffffff/);
  assert.match(trustTheme,/--cf19-text:#111827/);
  assert.match(trustTheme,/body\{color-scheme:light\}/);
  assert.match(trustTheme,/\.onboardingCard \.choice\{background:#fff!important;color:#1f2937!important/);
});
