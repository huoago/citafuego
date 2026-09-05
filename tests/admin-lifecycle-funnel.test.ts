import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const initial=fs.readFileSync('supabase/migrations/20260905192905_admin_lifecycle_funnel_v1.sql','utf8');
const fixed=fs.readFileSync('supabase/migrations/20260905192947_admin_lifecycle_funnel_role_fix_v1.sql','utf8');
const dashboard=fs.readFileSync('src/app/admin/page.tsx','utf8');

test('lifecycle funnel is an admin-only source-of-truth aggregate',()=>{
  assert.match(initial,/create or replace function public\.admin_get_lifecycle_funnel\(\)/i);
  assert.match(fixed,/security definer/i);
  assert.match(fixed,/if not public\.admin_has_any_role/i);
  assert.match(fixed,/raise exception 'forbidden'/i);
  for(const role of ['super_admin','trust_safety','support','finance','analyst','growth','content','seo'])assert.match(fixed,new RegExp(`'${role}'`));
  assert.match(fixed,/revoke all on function public\.admin_get_lifecycle_funnel\(\) from public/i);
  assert.match(fixed,/revoke all on function public\.admin_get_lifecycle_funnel\(\) from anon/i);
  assert.match(fixed,/grant execute on function public\.admin_get_lifecycle_funnel\(\) to authenticated/i);
});

test('lifecycle funnel excludes administrators and requires all legal consents',()=>{
  assert.match(fixed,/from public\.admin_user_roles aur/i);
  assert.match(fixed,/aur\.expires_at is null or aur\.expires_at > now\(\)/i);
  assert.match(fixed,/left join current_admins a on a\.user_id = u\.id/i);
  assert.match(fixed,/where a\.user_id is null/i);
  assert.match(fixed,/consent_type = 'terms' and ce\.granted/i);
  assert.match(fixed,/consent_type = 'privacy' and ce\.granted/i);
  assert.match(fixed,/consent_type = 'sensitive_data' and ce\.granted/i);
  assert.match(fixed,/pp\.status::text = 'approved'/i);
});

test('admin dashboard renders the real activation funnel without blocking core metrics',()=>{
  assert.match(dashboard,/rpc\('admin_get_lifecycle_funnel'\)/);
  assert.match(dashboard,/Embudo real · registro → confianza/);
  assert.match(dashboard,/Excluye cuentas administrativas/);
  assert.match(dashboard,/Términos \+ Privacidad \+ Datos sensibles/);
  assert.match(dashboard,/Foto aprobada/);
  assert.match(dashboard,/funnelError\?/);
});
