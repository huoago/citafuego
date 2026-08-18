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
  assert.doesNotMatch(migration,/login_email text/);
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

test('V12.1 account privilege stays inside Supabase Edge instead of copying admin keys into Vercel routes',()=>{
  const register=read('src/app/api/auth/account/register/route.ts');
  const login=read('src/app/api/auth/account/login/route.ts');
  const edge=read('supabase/functions/account-auth-v12/index.ts');
  assert.match(register,/callAccountEdge\(request,'register'/);
  assert.match(login,/callAccountEdge\(request,'login'/);
  assert.match(register,/auth\.setSession/);
  assert.match(login,/auth\.setSession/);
  assert.doesNotMatch(register,/createServiceClient|auth\.admin\.createUser|SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(login,/createServiceClient|auth\.admin\.getUserById|SUPABASE_SECRET_KEY/);
  assert.match(edge,/SUPABASE_SECRET_KEYS/);
  assert.match(edge,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edge,/auth\.admin\.createUser/);
  assert.match(edge,/auth\.admin\.getUserById/);
  assert.match(edge,/accounts\.citafuego\.invalid/);
});

test('V12.2 account bridge reads Vercel signed identity from request context before env fallback',()=>{
  const edge=read('supabase/functions/account-auth-v12/index.ts');
  const bridge=read('src/lib/auth/account-edge.ts');
  assert.match(edge,/createRemoteJWKSet/);
  assert.match(edge,/jwtVerify/);
  assert.match(edge,/https:\/\/oidc\.vercel\.com/);
  assert.match(edge,/huoago-7712s-projects/);
  assert.match(edge,/projectName='citafuego-prod'/);
  assert.match(edge,/environment:production/);
  assert.match(edge,/unauthorized_backend/);
  assert.match(bridge,/getVercelRequestOidcToken/);
  assert.match(bridge,/request\.headers\.get\('x-vercel-oidc-token'\)/);
  assert.match(bridge,/process\.env\.VERCEL_OIDC_TOKEN/);
  assert.ok(bridge.indexOf("request.headers.get('x-vercel-oidc-token')")<bridge.indexOf('process.env.VERCEL_OIDC_TOKEN'));
  assert.match(bridge,/authorization:`Bearer \$\{oidcToken\}`/);
  assert.match(bridge,/redirect:'error'/);
});

test('V12.1 account edge trusts client fingerprint only after backend identity and rate-limits atomically',()=>{
  const edge=read('supabase/functions/account-auth-v12/index.ts');
  const bridge=read('src/lib/auth/account-edge.ts');
  const migration=read('supabase/migrations/075_account_auth_edge_rate_limits.sql');
  assert.ok(edge.indexOf('verifyVercelIdentity(req)')<edge.indexOf("x-citafuego-client-fingerprint"));
  assert.match(bridge,/createHash\('sha256'\)/);
  assert.match(bridge,/x-forwarded-for/);
  assert.match(migration,/pg_advisory_xact_lock/);
  assert.match(migration,/register_ip/);
  assert.match(migration,/login_ip/);
  assert.match(migration,/login_account/);
  assert.match(migration,/revoke all on function public\.consume_account_auth_rate_limit/);
});

test('V12.2 account readiness probes Edge using Next request-context OIDC',()=>{
  const readiness=read('src/lib/auth/provider-readiness.ts');
  assert.match(readiness,/import \{headers\} from 'next\/headers'/);
  assert.match(readiness,/requestHeaders\.get\('x-vercel-oidc-token'\)/);
  assert.match(readiness,/process\.env\.VERCEL_OIDC_TOKEN/);
  assert.match(readiness,/functions\/v1\/account-auth-v12/);
  assert.match(readiness,/JSON\.stringify\(\{action:'health'\}\)/);
  assert.match(readiness,/authorization:`Bearer \$\{oidcToken\}`/);
  assert.match(readiness,/redirect:'error'/);
  assert.match(readiness,/account:boolean/);
  assert.doesNotMatch(readiness,/getSupabaseServerSecret|isAccountAuthProductionReady|SUPABASE_SECRET_KEY/);
});

test('V12 account registration still requires Turnstile and creates no public email or phone requirement',()=>{
  const route=read('src/app/api/auth/account/register/route.ts');
  const form=read('src/components/auth/account-auth-form.tsx');
  assert.match(route,/verifyTurnstile\(request,parsed\.data\.turnstileToken,'register'\)/);
  assert.match(form,/Nombre de cuenta/);
  assert.match(form,/Contraseña/);
  assert.match(form,/Repite la contraseña/);
  assert.doesNotMatch(route,/phone:z\.string/);
});

test('V12 account login keeps generic credential errors and correct Turnstile action',()=>{
  const route=read('src/app/api/auth/account/login/route.ts');
  assert.match(route,/invalid_credentials/);
  assert.match(route,/verifyTurnstile\(request,parsed\.data\.turnstileToken,'login'\)/);
  assert.match(route,/callAccountEdge/);
  assert.doesNotMatch(route,/account_usernames|auth\.admin/);
});

test('V12 account auth is the first registration method',()=>{
  const switcher=read('src/components/auth/auth-method-switcher.tsx');
  assert.match(switcher,/type Method='account'\|'email'\|'phone'\|'google'/);
  assert.match(switcher,/\['account','email','phone','google'\]/);
  assert.match(switcher,/account:'Cuenta'/);
  assert.match(switcher,/readiness\.account/);
  assert.match(switcher,/AccountAuthForm/);
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
  const completionMigration=read('supabase/migrations/066_auth_safety_membership_controls.sql');
  assert.match(phoneRequest,/isPhoneAuthProductionReady/);
  assert.match(phoneRequest,/auth\.updateUser\(\{phone/);
  assert.match(phoneVerify,/type:'phone_change'/);
  assert.match(completionMigration,/v_phone_confirmed/);
  assert.match(completionMigration,/phone_verified_at/);
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
