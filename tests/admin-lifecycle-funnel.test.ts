import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const initial=fs.readFileSync('supabase/migrations/20260905192905_admin_lifecycle_funnel_v1.sql','utf8');
const roleFix=fs.readFileSync('supabase/migrations/20260905192947_admin_lifecycle_funnel_role_fix_v1.sql','utf8');
const latest=fs.readFileSync('supabase/migrations/20260905195627_lifecycle_cohort_and_activation_recheck_v2.sql','utf8');
const dashboard=fs.readFileSync('src/app/admin/page.tsx','utf8');

test('lifecycle funnel remains an admin-only source-of-truth aggregate',()=>{
  assert.match(initial,/create or replace function public\.admin_get_lifecycle_funnel\(\)/i);
  assert.match(roleFix,/security definer/i);
  assert.match(latest,/security definer/i);
  assert.match(latest,/if not public\.admin_has_any_role/i);
  assert.match(latest,/raise exception 'forbidden'/i);
  for(const role of ['super_admin','trust_safety','support','finance','analyst','growth','content','seo'])assert.match(latest,new RegExp(`'${role}'`));
  assert.match(latest,/revoke all on function public\.admin_get_lifecycle_funnel\(\) from public/i);
  assert.match(latest,/revoke all on function public\.admin_get_lifecycle_funnel\(\) from anon/i);
  assert.match(latest,/grant execute on function public\.admin_get_lifecycle_funnel\(\) to authenticated/i);
});

test('operational cohort preserves raw accounts while narrowly separating pre-account-auth residue',()=>{
  assert.match(latest,/from public\.admin_user_roles aur/i);
  assert.match(latest,/aur\.expires_at is null or aur\.expires_at > now\(\)/i);
  assert.match(latest,/left join current_admins a on a\.user_id = u\.id/i);
  assert.match(latest,/where a\.user_id is null/i);
  assert.match(latest,/2026-08-18 19:57:07\+00/);
  assert.match(latest,/ru\.provider = 'email'/i);
  assert.match(latest,/ru\.last_sign_in_at is null/i);
  assert.match(latest,/not exists \([\s\S]*from public\.account_usernames au where au\.user_id = ru\.id/i);
  assert.match(latest,/not exists \([\s\S]*from public\.profiles p where p\.id = ru\.id/i);
  assert.match(latest,/'realAccounts'/);
  assert.match(latest,/'legacyRegistrationResidue'/);
  assert.match(latest,/'operationalAccounts'/);
  assert.match(latest,/where not cu\.legacy_registration_residue/i);
});

test('lifecycle legal stage uses all three current document versions and approved photos only',()=>{
  assert.match(latest,/join public\.legal_document_versions ld/i);
  assert.match(latest,/ld\.current_version = ce\.document_version/i);
  assert.match(latest,/ce\.consent_type in \('terms','privacy','sensitive_data'\)/i);
  assert.match(latest,/having count\(distinct ce\.consent_type\) = 3/i);
  assert.match(latest,/join operational_users ou on ou\.id = ce\.user_id/i);
  assert.match(latest,/pp\.status::text = 'approved'/i);
  assert.match(latest,/'activeWithoutCurrentLegalConsent'/);
});

test('active profiles missing current legal consent are re-evaluated without deleting user data',()=>{
  assert.match(latest,/where p\.status::text = 'active'/i);
  assert.match(latest,/ce\.consent_type = 'terms'[\s\S]*ce\.document_version = ld\.current_version/i);
  assert.match(latest,/ce\.consent_type = 'privacy'[\s\S]*ce\.document_version = ld\.current_version/i);
  assert.match(latest,/ce\.consent_type = 'sensitive_data'[\s\S]*ce\.document_version = ld\.current_version/i);
  assert.match(latest,/perform public\.refresh_profile_activation_for\(r\.id\)/i);
  assert.doesNotMatch(latest,/delete from public\.(profiles|user_private|consent_events|account_usernames)/i);
});

test('admin dashboard distinguishes raw, legacy and operational cohorts and warns on legal drift',()=>{
  assert.match(dashboard,/rpc\('admin_get_lifecycle_funnel'\)/);
  assert.match(dashboard,/Embudo operativo · registro → confianza/);
  assert.match(dashboard,/Cuentas no administrativas · bruto/);
  assert.match(dashboard,/Registros históricos incompletos/);
  assert.match(dashboard,/Cohorte operativa actual/);
  assert.match(dashboard,/18 ago 2026 19:57 UTC/);
  assert.match(dashboard,/No se elimina ninguna cuenta/);
  assert.match(dashboard,/Consentimiento legal vigente/);
  assert.match(dashboard,/pct\(privateStarted,operationalAccounts\)/);
  assert.match(dashboard,/pct\(legalConsented,operationalAccounts\)/);
  assert.match(dashboard,/pct\(profilesCreated,operationalAccounts\)/);
  assert.match(dashboard,/activeWithoutCurrentLegalConsent/);
  assert.match(dashboard,/Integridad legal/);
  assert.match(dashboard,/funnelError\?/);
});
