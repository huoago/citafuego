import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');

test('V14 removes password composition rules while keeping a small Auth-compatible floor',()=>{
  const form=read('src/components/auth/account-auth-form.tsx');
  const route=read('src/app/api/auth/account/register/route.ts');
  const edge=read('supabase/functions/account-auth-v12/index.ts');
  assert.match(form,/minLength=\{mode==='register'\?6:1\}/);
  assert.match(form,/No exigimos mayúsculas, números ni símbolos/);
  assert.match(route,/password:z\.string\(\)\.min\(6\)\.max\(72\)/);
  assert.doesNotMatch(route,/regex\(\/\[A-Za-z\]\//);
  assert.match(edge,/validRegisterPassword\(value:string\).*value\.length>=6&&value\.length<=72/);
  assert.doesNotMatch(edge,/validRegisterPassword.*A-Za-z/);
});

test('V14 birth date uses separate scrollable day month and year selectors',()=>{
  const form=read('src/components/auth/complete-registration-form.tsx');
  assert.match(form,/birthDay/);assert.match(form,/birthMonth/);assert.match(form,/birthYear/);
  assert.match(form,/aria-label="Día"/);assert.match(form,/aria-label="Mes"/);assert.match(form,/aria-label="Año"/);
  assert.match(form,/Enero/);assert.match(form,/Diciembre/);
  assert.doesNotMatch(form,/type="date"/);
  assert.match(form,/candidateBirthDate<=maxAdultDate/);
});

test('V14 profile enrichment fields are optional in UI and API',()=>{
  const flow=read('src/components/onboarding/onboarding-flow.tsx');
  const route=read('src/app/api/onboarding/profile/route.ts');
  assert.match(flow,/Solo el nombre visible es necesario para guardar/);
  assert.doesNotMatch(flow,/name="gender"[^>]*required/);
  assert.doesNotMatch(flow,/name="district"[^>]*required/);
  assert.doesNotMatch(flow,/name="bio"[^>]*minLength/);
  assert.match(flow,/disabled=\{busy\}>\{busy\?'Guardando…':'Guardar y continuar'\}/);
  assert.match(route,/bio:z\.string\(\)\.trim\(\)\.max\(500\)\.default\(''\)/);
  assert.match(route,/interestedIn:z\.array.*\.default\(\[\]\)/);
  assert.match(route,/interestIds:z\.array.*\.default\(\[\]\)/);
  assert.match(route,/save_onboarding_profile_v14/);
});

test('V14 street label is private and can open Google Maps',()=>{
  const migration=read('supabase/migrations/077_onboarding_friction_and_profile_save.sql');
  const flow=read('src/components/onboarding/onboarding-flow.tsx');
  const page=read('src/app/onboarding/page.tsx');
  assert.match(migration,/user_location_private[\s\S]*address_label text/);
  assert.match(migration,/p_address_label text/);
  assert.match(page,/user_location_private/);assert.match(page,/address_label/);
  assert.match(flow,/Calle \/ zona/);assert.match(flow,/opcional y privada/);
  assert.match(flow,/https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  assert.match(flow,/noopener,noreferrer/);
});

test('V14 optional enrichment no longer blocks activation but safety gates remain',()=>{
  const migration=read('supabase/migrations/077_onboarding_friction_and_profile_save.sql');
  const activation=migration.slice(migration.indexOf('-- Optional profile enrichment never blocks activation'),migration.indexOf('update public.profiles'));
  assert.match(activation,/public\.is_adult/);
  assert.match(activation,/v_photos>=2/);
  assert.match(activation,/verification_badge/);
  assert.match(activation,/v_terms and v_privacy and v_sensitive/);
  assert.match(activation,/sanctions/);
  assert.doesNotMatch(activation,/bio/);
  assert.doesNotMatch(activation,/interested_in/);
  assert.doesNotMatch(activation,/v_interests/);
});
