import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const lifecycle='supabase/migrations/20260903031300_admin_operations_user_lifecycle_v2.sql';
const superLifecycle='supabase/migrations/20260903032000_admin_super_admin_lifecycle_v2.sql';

test('admin layout never returns a white screen for missing access',()=>{
  const source=read('src/app/admin/layout.tsx');
  assert.match(source,/iniciar-sesion\?next=\/admin/);
  assert.match(source,/403 · Acceso denegado/);
  assert.doesNotMatch(source,/if\(!auth\)return null/);
});

test('admin role registry includes production operational roles',()=>{
  const source=read('src/lib/admin/auth.ts');
  for(const role of ['super_admin','trust_safety','support','finance','analyst','growth','content','seo'])assert.match(source,new RegExp(`'${role}'`));
});

test('dashboard and users expose explicit 90-day inactivity controls',()=>{
  const users=read('src/app/admin/users/page.tsx');
  assert.match(read('src/app/admin/page.tsx'),/3 meses sin iniciar sesión/);
  assert.match(users,/name="inactive"/);
  assert.match(users,/<option value="90">Sin login 3 meses<\/option>/);
  assert.match(users,/inactive===90/);
  assert.match(read(lifecycle),/inactive_user_days/);
  assert.match(read(lifecycle),/inactive90d/);
});

test('inactive users can never be auto-deleted by an operations toggle',()=>{
  const sql=read(lifecycle);const operations=read('src/app/admin/operations/page.tsx');
  assert.match(sql,/auto_delete_inactive_users/);
  assert.match(sql,/automatic_inactive_deletion_not_allowed/);
  assert.match(operations,/eliminación automática de usuarios inactivos está bloqueada por servidor/i);
  assert.match(operations,/locked=s\.key==='auto_delete_inactive_users'/);
});

test('account deletion is two-stage, confirmed and audited',()=>{
  const sql=read(lifecycle);
  for(const token of ['account_deletion_jobs','admin_request_account_deletion','admin_finalize_account_deletion','p_confirmation<>\'CONFIRM\'','p_confirmation<>\'DELETE\'','delete from auth.refresh_tokens','delete from auth.sessions','admin_audit_log'])assert.ok(sql.includes(token),`missing ${token}`);
  assert.match(sql,/cannot_delete_self/);
  assert.match(sql,/cannot_delete_admin_account/);
  assert.doesNotMatch(sql,/delete from public\.admin_audit_log/);
});

test('Super Admin rotation protects self and the last owner',()=>{
  const sql=read(superLifecycle);
  assert.match(sql,/cannot_disable_self/);
  assert.match(sql,/last_super_admin_protected/);
  assert.match(sql,/DISABLE ADMIN/);
  assert.match(sql,/delete from auth\.sessions/);
  assert.match(sql,/admin_account_disabled/);
});

test('new production backoffice modules exist',()=>{
  for(const route of ['operations','appeals','boosts','memberships','payments','seo','locations','health','risk','email','realtime','content'])assert.ok(fs.existsSync(`src/app/admin/${route}/page.tsx`),`missing /admin/${route}`);
});

test('realtime and risk overviews do not expose private message bodies',()=>{
  const realtime=read('src/app/admin/realtime/page.tsx');
  const risk=read('src/app/admin/risk/page.tsx');
  assert.doesNotMatch(realtime,/\.select\([^)]*body/i);
  assert.doesNotMatch(risk,/\.select\([^)]*body/i);
  assert.match(realtime,/No se cargan cuerpos de mensajes/);
});
