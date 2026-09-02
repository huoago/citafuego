import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');

test('account registration no longer requires ten-character passwords',()=>{
  const form=read('src/components/auth/account-auth-form.tsx');
  const route=read('src/app/api/auth/account/register/route.ts');
  const edge=read('supabase/functions/account-auth-v12/index.ts');
  assert.match(form,/REGISTRATION_PASSWORD_MIN_LENGTH=6/);
  assert.match(route,/password:z\.string\(\)\.min\(6\)\.max\(72\)/);
  assert.match(edge,/const passwordMinLength=6/);
  assert.match(edge,/passwordMinLength,passwordMaxLength/);
  assert.doesNotMatch(form,/al menos 10 caracteres/);
});

test('password fields can be shown and hidden without changing the submitted value',()=>{
  const form=read('src/components/auth/account-auth-form.tsx');
  assert.match(form,/showPassword/);
  assert.match(form,/showConfirmPassword/);
  assert.match(form,/showPassword\?'text':'password'/);
  assert.match(form,/showConfirmPassword\?'text':'password'/);
  assert.match(form,/Mostrar/);
  assert.match(form,/Ocultar/);
  assert.match(form,/aria-pressed=\{showPassword\}/);
});
