import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');

test('Google and phone identities must complete the adult legal gate before app access',()=>{
  const migration=read('supabase/migrations/066_auth_safety_membership_controls.sql');
  const layout=read('src/app/(app)/layout.tsx');
  const confirm=read('src/app/auth/confirm/route.ts');
  assert.match(migration,/v_provider in \('google','phone'\)/);
  assert.match(migration,/complete_pending_registration/);
  assert.match(migration,/adult_only/);
  assert.match(migration,/social_auth_completion/);
  assert.match(layout,/redirect\('\/registro\/completar'\)/);
  assert.match(confirm,/exchangeCodeForSession/);
});

test('registration exposes email phone and Google without removing Magic Link fallback',()=>{
  const register=read('src/app/(auth)/registro/page.tsx');
  const login=read('src/app/(auth)/iniciar-sesion/page.tsx');
  const google=read('src/app/auth/google/route.ts');
  const phone=read('src/app/api/auth/phone/request/route.ts');
  assert.match(register,/SocialAuthButtons/);assert.match(register,/PhoneAuthForm/);assert.match(register,/RegisterForm/);
  assert.match(login,/SocialAuthButtons/);assert.match(login,/PhoneAuthForm/);assert.match(login,/LoginForm/);
  assert.match(google,/provider:'google'/);assert.match(google,/exchange|redirectTo/);
  assert.match(phone,/signInWithOtp/);assert.match(phone,/shouldCreateUser/);
});

test('automated safety triage aggregates independent signals and never auto-bans',()=>{
  const migration=read('supabase/migrations/066_auth_safety_membership_controls.sql');
  assert.match(migration,/count\(distinct reporter_id\)/);
  assert.match(migration,/count\(distinct blocker_id\)/);
  assert.match(migration,/v_severe_reporters>=2/);
  assert.match(migration,/v_reporters>=4/);
  assert.match(migration,/v_blockers>=6/);
  assert.match(migration,/status='restricted'/);
  assert.match(migration,/human_review/);
  assert.doesNotMatch(migration,/status='banned'/);
});

test('one severe report is prioritized for human review rather than automatic permanent punishment',()=>{
  const migration=read('supabase/migrations/066_auth_safety_membership_controls.sql');
  assert.match(migration,/p_category in \('minor_risk','threat'\).*v_priority:='p0'/s);
  assert.match(migration,/high_severity_user_report/);
  assert.match(migration,/perform public\.auto_review_user_safety/);
});

test('membership stays reversible behind a feature flag and is hidden by default',()=>{
  const feature=read('src/lib/features/premium.ts');
  const layout=read('src/app/(app)/premium/layout.tsx');
  const checkout=read('src/app/api/premium/checkout/route.ts');
  assert.match(feature,/PREMIUM_ENABLED==='true'/);
  assert.match(layout,/redirect\('\/perfil'\)/);
  assert.match(checkout,/feature_unavailable/);
});
