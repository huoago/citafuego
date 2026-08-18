import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

test('V8 derives Google and phone availability from Supabase Auth settings using shared production config',()=>{
  const readiness=read('src/lib/auth/provider-readiness.ts');
  assert.match(readiness,/getSupabasePublishableKey,getSupabaseUrl/);
  assert.match(readiness,/getSupabaseUrl\(\)/);
  assert.match(readiness,/getSupabasePublishableKey\(\)/);
  assert.doesNotMatch(readiness,/process\.env\.NEXT_PUBLIC_SUPABASE/);
  assert.match(readiness,/\/auth\/v1\/settings/);
  assert.match(readiness,/external\?\.google===true/);
  assert.match(readiness,/sms_provider/);
  assert.match(readiness,/revalidate:60/);
  assert.match(readiness,/google:false,phone:false/);
});

test('V8 registration and login gate unavailable providers before interaction',()=>{
  const register=read('src/app/(auth)/registro/page.tsx');
  const login=read('src/app/(auth)/iniciar-sesion/page.tsx');
  const switcher=read('src/components/auth/auth-method-switcher.tsx');
  assert.match(register,/getAuthProviderReadiness/);
  assert.match(login,/getAuthProviderReadiness/);
  assert.match(switcher,/readiness\.phone/);
  assert.match(switcher,/readiness\.google/);
  assert.match(switcher,/disabled=\{!enabled\}/);
  assert.match(switcher,/No disponible/);
});

test('V8 routes enforce readiness even if a disabled UI is bypassed',()=>{
  const google=read('src/app/auth/google/route.ts');
  const phone=read('src/app/api/auth/phone/request/route.ts');
  assert.match(google,/getAuthProviderReadiness/);
  assert.match(google,/if\(!readiness\.google\)/);
  assert.match(phone,/getAuthProviderReadiness/);
  assert.match(phone,/if\(!readiness\.phone\)/);
  assert.match(phone,/phone_provider_unavailable/);
});

test('V8 auth callback accepts recovery token exchange without weakening safe-next',()=>{
  const confirm=read('src/app/auth/confirm/route.ts');
  assert.match(confirm,/['"]recovery['"]/);
  assert.match(confirm,/rawType==='recovery'/);
  assert.match(confirm,/value&&value\.startsWith\('\/'\)&&!value\.startsWith\('\/\/'\)/);
});

test('V8 exposes only safe provider readiness and production verifies it',()=>{
  const route=read('src/app/api/auth/readiness/route.ts');
  const audit=read('scripts/check-auth-readiness.mjs');
  const workflow=read('.github/workflows/production-deploy.yml');
  assert.match(route,/getAuthProviderReadiness/);
  assert.match(route,/cache-control':'no-store/);
  assert.match(audit,/\/auth\/v1\/settings/);
  assert.match(audit,/\/config\/auth/);
  assert.doesNotMatch(audit,/console\.log\([^\n]*smtp_pass/);
  assert.match(workflow,/Audit production auth readiness/);
  assert.match(workflow,/Verify deployed auth readiness endpoint/);
  assert.match(workflow,/Google Auth:/);
  assert.match(workflow,/Custom SMTP:/);
});
