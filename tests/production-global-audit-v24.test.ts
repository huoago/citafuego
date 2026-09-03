import assert from 'node:assert/strict';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';

const read=(path:string)=>readFileSync(path,'utf8');
function runtimeFiles(root:string):string[]{
  const files:string[]=[];
  for(const entry of readdirSync(root,{withFileTypes:true})){
    const path=join(root,entry.name);
    if(entry.isDirectory()) files.push(...runtimeFiles(path));
    else if(/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(path);
  }
  return files;
}

test('Next TypeScript configuration is pre-normalized and build-stable',()=>{
  const config=JSON.parse(read('tsconfig.json'));
  assert.equal(config.compilerOptions.jsx,'react-jsx');
  assert.ok(config.include.includes('.next/types/**/*.ts'));
  assert.ok(config.include.includes('.next/dev/types/**/*.ts'));
});

test('runtime source contains no TypeScript suppression or dynamic code execution escape hatches',()=>{
  for(const file of runtimeFiles('src')){
    const source=read(file);
    assert.doesNotMatch(source,/@ts-(?:ignore|nocheck)/,`${file} contains a TypeScript suppression`);
    assert.doesNotMatch(source,/\beval\s*\(/,`${file} contains eval()`);
    assert.doesNotMatch(source,/\bnew\s+Function\s*\(/,`${file} contains new Function()`);
  }
});

test('service worker has one maintained registration path and never precaches the homepage',()=>{
  assert.equal(existsSync('src/components/pwa-registrar.tsx'),false);
  const layout=read('src/app/layout.tsx');
  const sw=read('public/sw.js');
  assert.match(layout,/serviceWorker\.register\('\/sw\.js'/);
  assert.match(layout,/updateViaCache:'none'/);
  assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/);
  assert.doesNotMatch(sw,/STATIC_ASSETS\s*=\s*\[[^\]]*['"]\/['"]/s);
});

test('versioned shell patch CSS cannot return to the global layout',()=>{
  const layout=read('src/app/layout.tsx');
  assert.doesNotMatch(layout,/v2[1-9]-.*\.css/);
  assert.equal(existsSync('src/app/v22-global-navigation-profile.css'),false);
  assert.equal(existsSync('src/app/v22-sticky-offsets.css'),false);
});

test('current activation source of truth keeps trust signals optional',()=>{
  const migration=read('supabase/migrations/078_optional_photo_verification_trust.sql');
  const route=read('src/app/api/onboarding/activate/route.ts');
  assert.match(migration,/Photos and selfie verification intentionally DO NOT block activation/);
  assert.match(migration,/v_active:=public\.is_adult\(v_birth\)/);
  assert.match(migration,/and not v_sanctioned/);
  assert.match(route,/refresh_profile_activation/);
});

test('internal visibility helper predicates are not exposed as authenticated RPCs',()=>{
  const migration=read('supabase/migrations/20260903140000_lock_internal_visibility_helpers.sql');
  for(const signature of [
    'can_read_private_album_object\\(text, uuid\\)',
    'can_view_private_album\\(uuid, uuid\\)',
    'creator_marketplace_eligible\\(uuid\\)',
    'is_active_match_pair\\(uuid, uuid\\)',
    'is_blog_friend\\(uuid, uuid\\)',
  ]){
    assert.match(migration,new RegExp(`revoke all on function public\\.${signature} from public, anon, authenticated`));
  }
});

test('referral code hashing resolves pgcrypto from the Supabase extensions schema',()=>{
  const migration=read('supabase/migrations/20260903143000_fix_referral_pgcrypto_schema.sql');
  assert.match(migration,/alter function public\.get_my_referral_code\(\) set search_path = 'public', 'extensions'/);
});

test('admin dashboard uses the real matches timestamp column',()=>{
  const migration=read('supabase/migrations/20260903144500_fix_admin_dashboard_match_timestamp.sql');
  assert.match(migration,/from public\.matches where matched_at>=now\(\)-interval '7 days'/);
  assert.doesNotMatch(migration,/from public\.matches where created_at>=/);
});

test('admin billing maps commercialization provider status instead of removed columns',()=>{
  const migration=read('supabase/migrations/20260903150000_fix_admin_billing_provider_shape.sql');
  assert.match(migration,/'enabled',status='live','mode',status/);
  assert.doesNotMatch(migration,/provider_slug,'enabled',enabled,'mode',mode/);
});
