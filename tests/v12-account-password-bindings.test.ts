import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

test('V12 stores usernames in a private service-only mapping with case-insensitive uniqueness',()=>{
  const migration=read('supabase/migrations/074_username_password_accounts.sql');
  assert.match(migration,/create table if not exists public\.account_usernames/);
  assert.match(migration,/normalized_username text not null unique/);
  assert.match(migration,/alter table public\.account_usernames enable row level security/);
  assert.match(migration,/revoke all on table public\.account_usernames from public,anon,authenticated/);
  assert.match(migration,/grant select,insert,update,delete on table public\.account_usernames to service_role/);
  assert.match(migration,/@accounts\.citafuego\.invalid/);
});

test('V12 pending username identities cannot bypass the existing adult legal completion gate',()=>{
  const migration=read('supabase/migrations/074_username_password_accounts.sql');
  const completion=read('src/app/api/auth/complete-registration/route.ts');
  assert.match(migration,/v_username_account boolean/);
  assert.match(migration,/if v_provider in \('google','phone'\) or v_username_account then return new/);
  assert.match(completion,/isAdultBirthDate/);
  assert.match(completion,/complete_pending_registration/);
  assert.match(completion,/p_accept_terms:true/);
  assert.match(completion,/p_accept_privacy:true/);
  assert.match(completion,/p_accept_sensitive:true/);
});

test('V12 account signup keeps password in Supabase Auth and requires no public email or phone',()=>{
  const route=read('src/app/api/auth/account/register/route.ts');
  const helper=read('src/lib/auth/account-identity.ts');
  assert.match(route,/auth\.admin\.createUser/);
  assert.match(route,/email_confirm:true/);
  assert.match(route,/password:parsed\.data\.password/);
  assert.match(route,/account_usernames/);
  assert.match(route,/signInWithPassword/);
  assert.match(route,/next:'\/registro\/completar'/);
  assert.match(route,/verifyTurnstile\(request,parsed\.data\.turnstileToken,'register'\)/);
  assert.match(helper,/accounts\.citafuego\.invalid/);
  assert.doesNotMatch(route,/phone:z\.string/);
});

test('V12 account login resolves the private username and returns generic invalid credentials',()=>{
  const route=read('src/app/api/auth/account/login/route.ts');
  assert.match(route,/normalized_username/);
  assert.match(route,/select\('login_email'\)/);
  assert.match(route,/signInWithPassword/);
  assert.match(route,/invalid_credentials/);
  assert.match(route,/verifyTurnstile\(request,parsed\.data\.turnstileToken,'login'\)/);
});

test('V12 account auth is the first registration method and readiness never exposes the server secret',()=>{
  const switcher=read('src/components/auth/auth-method-switcher.tsx');
  const readiness=read('src/lib/auth/provider-readiness.ts');
  const service=read('src/lib/supabase/service.ts');
  assert.match(switcher,/type Method='account'\|'email'\|'phone'\|'google'/);
  assert.match(switcher,/\['account','email','phone','google'\]/);
  assert.match(switcher,/account:'Cuenta'/);
  assert.match(switcher,/readiness\.account/);
  assert.match(switcher,/AccountAuthForm/);
  assert.match(readiness,/account:boolean/);
  assert.match(readiness,/isAccountAuthProductionReady/);
  assert.match(service,/SUPABASE_SECRET_KEY/);
  assert.match(service,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(readiness,/return\{[^}]*SUPABASE_SECRET_KEY/);
});

test('V12 Turnstile separates register and login actions',()=>{
  const field=read('src/components/auth/turnstile-field.tsx');
  const form=read('src/components/auth/account-auth-form.tsx');
  assert.match(field,/action\?:'register'\|'login'/);
  assert.match(field,/action='register'/);
  assert.match(field,/action,callback/);
  assert.match(form,/action=\{mode\}/);
});

test('V12 optional contact binding proves phone ownership and fails closed on unavailable providers',()=>{
  const phoneRequest=read('src/app/api/auth/bind/phone/request/route.ts');
  const phoneVerify=read('src/app/api/auth/bind/phone/verify/route.ts');
  const email=read('src/app/api/auth/bind/email/route.ts');
  assert.match(phoneRequest,/isPhoneAuthProductionReady/);
  assert.match(phoneRequest,/auth\.updateUser\(\{phone/);
  assert.match(phoneVerify,/type:'phone_change'/);
  assert.match(phoneVerify,/phone_verified_at/);
  assert.match(email,/isEmailRegistrationProductionReady/);
  assert.match(email,/auth\.updateUser\(\{email/);
});

test('V12 contact binding is optional and never blocks legal registration completion',()=>{
  const form=read('src/components/auth/complete-registration-form.tsx');
  const page=read('src/app/(auth)/registro/completar/page.tsx');
  assert.match(form,/Vincula tu cuenta/);
  assert.match(form,/Puedes omitirlo/);
  assert.match(form,/\/api\/auth\/bind\/email/);
  assert.match(form,/\/api\/auth\/bind\/phone\/request/);
  assert.match(form,/\/api\/auth\/bind\/phone\/verify/);
  assert.match(form,/disabled=\{busy\|\|!birthDate\|\|!terms\|\|!privacy\|\|!sensitive\}/);
  assert.doesNotMatch(form,/disabled=\{[^}]*emailState[^}]*phoneState/);
  assert.match(page,/isInternalAccountEmail/);
});

test('V12 registration visuals cover account passwords and optional contact cards at high contrast',()=>{
  const css=read('src/app/registration-v9.css');
  assert.match(css,/input\[type="password"\]/);
  assert.match(css,/\.authSegmented4/);
  assert.match(css,/\.optionalBindingSection/);
  assert.match(css,/\.bindingCard/);
  assert.match(css,/background:#0b0707;color:#fff7f2/);
});

test('V12 production smoke validates Cuenta when account auth is ready',()=>{
  const smoke=read('e2e/production-smoke.mjs');
  assert.match(smoke,/authReadiness\.account/);
  assert.match(smoke,/requireText\(body,path,'Cuenta'\)/);
  assert.match(smoke,/!authReadiness\.account&&!authReadiness\.emailRegistration/);
});
