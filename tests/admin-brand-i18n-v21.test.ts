import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read=(p:string)=>fs.readFileSync(p,'utf8');

test('mascot is the production site logo and has reduced-motion-safe animation',()=>{
  assert.ok(fs.existsSync('public/mascot-logo.svg'));
  const layout=read('src/app/layout.tsx');
  const nav=read('src/components/global-site-nav.tsx');
  const css=read('src/app/v21-contrast-brand.css');
  assert.match(layout,/mascot-logo\.svg/);
  assert.match(nav,/globalSiteBrandMascot/);
  assert.match(nav,/src="\/mascot-logo\.svg"/);
  assert.match(css,/@keyframes cfMascotFloat/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test('global control contrast explicitly prevents light-on-light form states',()=>{
  const css=read('src/app/v21-contrast-brand.css');
  assert.match(css,/input:not\(\[type="hidden"\]\)/);
  assert.match(css,/background:var\(--cf-readable-bg\)!important/);
  assert.match(css,/-webkit-text-fill-color:var\(--cf-readable-text\)!important/);
  assert.match(css,/input::placeholder/);
  assert.match(css,/select option/);
  assert.match(css,/input:disabled,select:disabled,textarea:disabled/);
});

test('admin navigation is a left collapsible sidebar with bilingual and edit-mode controls',()=>{
  const nav=read('src/components/admin/admin-nav.tsx');
  const layout=read('src/app/admin/layout.tsx');
  const css=read('src/app/admin/admin-backoffice.css');
  assert.match(nav,/adminSidebar/);
  assert.match(nav,/aria-expanded=\{expanded\}/);
  assert.match(nav,/toggle\(group\.id\)/);
  assert.match(layout,/AdminLanguageSwitch/);
  assert.match(layout,/AdminFormMode/);
  assert.match(css,/grid-template-columns:240px minmax\(0,1fr\)/);
});

test('admin deletion no longer asks operators to type destructive confirmation words',()=>{
  const users=read('src/app/admin/users/page.tsx');
  const operations=read('src/app/admin/operations/page.tsx');
  assert.doesNotMatch(users,/pattern="CONFIRM"/);
  assert.doesNotMatch(operations,/pattern="DELETE"/);
  assert.match(users,/name="confirmed" value="yes" required/);
  assert.match(operations,/name="confirmed" value="yes" required/);
  assert.match(users,/p_confirmation:'CONFIRM'/);
  assert.match(operations,/p_confirmation:'DELETE'/);
});

test('manual membership grants target a specific user and duration and remain audited',()=>{
  const page=read('src/app/admin/memberships/page.tsx');
  const migration=read('supabase/migrations/20260903194409_admin_manual_membership_grants_v1.sql');
  assert.match(page,/admin_grant_membership/);
  assert.match(page,/name="user_id"/);
  assert.match(page,/name="duration_days"/);
  assert.match(page,/Fuego Plus/);
  assert.match(page,/Fuego Gold/);
  assert.match(migration,/admin_membership_grants/);
  assert.match(migration,/membership_granted/);
  assert.match(migration,/p_duration_days<1 or p_duration_days>3650/);
  assert.match(migration,/provider='admin_manual'/);
});

function walk(dir:string,files:string[]=[]){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full,files);else if(/\.(ts|tsx)$/.test(entry.name))files.push(full);
  }
  return files;
}

test('public product source contains no Chinese UI copy',()=>{
  const roots=['src/app','src/components'];
  const offenders:string[]=[];
  for(const root of roots){for(const file of walk(root)){
    const normalized=file.replaceAll('\\','/');
    if(normalized.includes('/admin/'))continue;
    const source=read(file);
    if(/[\u3400-\u9fff]/.test(source))offenders.push(normalized);
  }}
  assert.deepEqual(offenders,[],`Chinese UI copy found outside admin: ${offenders.join(', ')}`);
});
