import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');

test('Google and phone identities must complete the adult legal gate before app access',()=>{
  const migration=read('supabase/migrations/066_auth_safety_membership_controls.sql');
  const layout=read('src/app/(app)/layout.tsx');
  const confirm=read('src/app/auth/confirm/route.ts');
  assert.match(migration,/v_provider in \('google','phone'\)/);assert.match(migration,/complete_pending_registration/);assert.match(migration,/adult_only/);assert.match(migration,/social_auth_completion/);assert.match(layout,/redirect\('\/registro\/completar'\)/);assert.match(confirm,/exchangeCodeForSession/);
});

test('registration keeps one Email phone Google auth surface but renders only ready methods',()=>{
  const register=read('src/app/(auth)/registro/page.tsx');const login=read('src/app/(auth)/iniciar-sesion/page.tsx');const switcher=read('src/components/auth/auth-method-switcher.tsx');const google=read('src/app/auth/google/route.ts');const phone=read('src/app/api/auth/phone/request/route.ts');
  assert.match(register,/AuthMethodSwitcher/);assert.match(login,/AuthMethodSwitcher/);assert.match(switcher,/role="tablist"/);assert.match(switcher,/email:'Correo'/);assert.match(switcher,/phone:'Teléfono'/);assert.match(switcher,/google:'Google'/);assert.match(switcher,/filter\(item=>available\[item\]\)/);assert.match(switcher,/RegisterForm/);assert.match(switcher,/LoginForm/);assert.match(google,/provider:'google'/);assert.match(phone,/signInWithOtp/);
});

test('weighted automated safety triage resists new account velocity and reciprocal abuse and never auto-bans',()=>{
  const migration=read('supabase/migrations/070_explainable_safety_anti_abuse.sql');
  assert.match(migration,/reporter_safety_credibility/);assert.match(migration,/interval '1 day'/);assert.match(migration,/v_velocity>=8/);assert.match(migration,/v_score:=v_score\*0\.50/);assert.match(migration,/v_severe_reporters>=2/);assert.match(migration,/v_reporters>=3/);assert.match(migration,/status='restricted'/);assert.match(migration,/human_review/);assert.doesNotMatch(migration,/status='banned'/);
});

test('Risk Timeline is admin-only and exposes explainable signals without device-only enforcement',()=>{
  const migration=read('supabase/migrations/070_explainable_safety_anti_abuse.sql');const page=read('src/app/admin/risk/[userId]/page.tsx');
  assert.match(migration,/admin_get_user_risk_timeline/);assert.match(migration,/is_trust_admin\(auth\.uid\(\)\)/);assert.match(migration,/shared_device_accounts/);assert.match(page,/Risk Timeline/);assert.match(page,/solo señal auxiliar/);assert.match(page,/永久封禁/);
});

test('one severe report remains prioritized for human review rather than automatic permanent punishment',()=>{
  const migration=read('supabase/migrations/066_auth_safety_membership_controls.sql');assert.match(migration,/p_category in \('minor_risk','threat'\).*v_priority:='p0'/s);assert.match(migration,/high_severity_user_report/);assert.match(migration,/perform public\.auto_review_user_safety/);
});

test('membership stays reversible behind a feature flag and is hidden by default',()=>{
  const feature=read('src/lib/features/premium.ts');const layout=read('src/app/(app)/premium/layout.tsx');const checkout=read('src/app/api/premium/checkout/route.ts');assert.match(feature,/PREMIUM_ENABLED==='true'/);assert.match(layout,/redirect\('\/perfil'\)/);assert.match(checkout,/feature_unavailable/);
});
