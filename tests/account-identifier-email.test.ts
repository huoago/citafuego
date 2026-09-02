import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');

test('registration accepts either a username or an email-shaped private account identifier',()=>{
  const form=read('src/components/auth/account-auth-form.tsx');
  const identity=read('src/lib/auth/account-identity.ts');
  const register=read('src/app/api/auth/account/register/route.ts');
  const login=read('src/app/api/auth/account/login/route.ts');
  const edge=read('supabase/functions/account-auth-v12/index.ts');
  const migration=read('supabase/migrations/20260903050000_account_identifier_email_compat.sql');

  assert.match(form,/EMAIL_PATTERN/);
  assert.match(form,/Nombre de cuenta o correo/);
  assert.match(form,/maxLength=\{254\}/);
  assert.match(identity,/emailPattern/);
  assert.match(register,/username:z\.string\(\)\.trim\(\)\.min\(4\)\.max\(254\)/);
  assert.match(login,/username:z\.string\(\)\.trim\(\)\.min\(4\)\.max\(254\)/);
  assert.match(edge,/accountIdentifier:'username_or_email'/);
  assert.match(migration,/account_username_format/);
  assert.match(migration,/char_length\(username\) <= 254/);
});

test('invalid account identifiers are not reported as password-length failures',()=>{
  const form=read('src/components/auth/account-auth-form.tsx');
  const register=read('src/app/api/auth/account/register/route.ts');
  const edge=read('supabase/functions/account-auth-v12/index.ts');

  assert.match(register,/invalid_account_identifier/);
  assert.match(edge,/invalid_account_identifier/);
  assert.match(form,/code==='invalid_account_identifier'/);
  assert.match(form,/Usa un nombre de cuenta de 4–24 caracteres o un correo válido/);
});
