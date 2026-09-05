import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lifecycle='supabase/migrations/20260905203553_admin_super_admin_owner_lifecycle_v3.sql';
const constraints='supabase/migrations/20260905205257_admin_super_admin_temporary_grant_constraints_v4.sql';
const read=(path:string)=>fs.readFileSync(path,'utf8');

test('production Super Admin lifecycle uses explicit grant scopes and a permanent owner guard',()=>{
  const sql=read(lifecycle);
  for(const token of [
    "grant_scope text not null default 'delegated'",
    "'owner','qa','temporary_ops','delegated'",
    'guard_last_permanent_super_admin_owner',
    'admin_user_roles_last_owner_guard',
    'citafuego_permanent_owner_lifecycle',
    'last_permanent_owner_protected',
  ]) assert.ok(sql.includes(token),`missing ${token}`);
});

test('only a permanent owner can promote or revoke Super Admin and self-revocation is blocked',()=>{
  const sql=read(lifecycle);
  assert.match(sql,/create or replace function public\.admin_promote_super_admin/);
  assert.match(sql,/create or replace function public\.admin_revoke_super_admin/);
  assert.match(sql,/grant_scope='owner' and expires_at is null/);
  assert.match(sql,/permanent_owner_required/);
  assert.match(sql,/temporary_purpose_cannot_be_permanent/);
  assert.match(sql,/REVOKE SUPER ADMIN/);
  assert.match(sql,/cannot_revoke_self/);
  assert.match(sql,/super_admin_role_revoked/);
});

test('temporary QA and takeover grants can never become permanent',()=>{
  const sql=read(constraints);
  assert.match(sql,/admin_user_roles_temporary_scope_requires_expiry_check/);
  assert.match(sql,/grant_scope not in \('qa','temporary_ops'\) or expires_at is not null/);
});

test('QA test and validation reasons can never be attached to a permanent grant',()=>{
  const sql=read(constraints);
  assert.match(sql,/admin_user_roles_no_permanent_test_reason_check/);
  assert.match(sql,/expires_at is not null/);
  assert.match(sql,/qa\|test\|testing\|validation\|prueba\|pruebas/);
});

test('privileged lifecycle trigger is not exposed as a callable browser RPC',()=>{
  const sql=read(lifecycle);
  assert.match(sql,/revoke all on function public\.guard_last_permanent_super_admin_owner\(\) from public,anon,authenticated/);
  assert.match(sql,/revoke all on function public\.admin_promote_super_admin\(uuid,text,text\) from public,anon/);
  assert.match(sql,/revoke all on function public\.admin_revoke_super_admin\(uuid,text,text\) from public,anon/);
});
