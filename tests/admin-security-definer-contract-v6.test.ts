import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('admin SECURITY DEFINER exposure has a fail-closed migration contract',()=>{
  const sql=fs.readFileSync('supabase/migrations/20260905121500_admin_rpc_execution_contract_v6.sql','utf8');
  assert.match(sql,/has_function_privilege\('authenticated'/);
  assert.match(sql,/admin_has_any_role/);
  assert.match(sql,/is_trust_admin/);
  assert.match(sql,/Unsafe authenticated SECURITY DEFINER RPC/);
});

test('/explorar enters the real discovery funnel',()=>{
  const page=fs.readFileSync('src/app/explorar/page.tsx','utf8');
  assert.match(page,/redirect\('\/descubrir'\)/);
});


test('admin users blocks destructive actions for auth-only accounts',()=>{
  const page=fs.readFileSync('src/app/admin/users/page.tsx','utf8');
  assert.match(page,/!u\.status\?<div className="adminNotice warn">Cuenta de Auth sin perfil operativo/);
  assert.match(page,/Solo Auth · sin perfil/);
});
