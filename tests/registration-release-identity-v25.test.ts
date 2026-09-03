import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(path,'utf8');

test('registration account contract is six to seventy-two characters and stamped in SSR HTML',()=>{
  const form=read('src/components/auth/account-auth-form.tsx');
  assert.match(form,/REGISTRATION_PASSWORD_MIN_LENGTH=6/);
  assert.match(form,/PASSWORD_MAX_LENGTH=72/);
  assert.match(form,/data-registration-contract=\{mode==='register'\?'account-v25-6-72':undefined\}/);
  assert.match(form,/Nombre de cuenta o correo/);
  assert.doesNotMatch(form,/10–72 caracteres/);
});

test('registration route explicitly bypasses full-route and fetch caches',()=>{
  const page=read('src/app/(auth)/registro/page.tsx');
  assert.match(page,/export const dynamic='force-dynamic'/);
  assert.match(page,/export const revalidate=0/);
  assert.match(page,/export const fetchCache='force-no-store'/);
});

test('production smoke rejects stale registration HTML',()=>{
  const pkg=JSON.parse(read('package.json'));
  const smoke=read('e2e/registration-release-smoke.mjs');
  assert.match(pkg.scripts['e2e:smoke'],/registration-release-smoke\.mjs/);
  assert.match(smoke,/account-v25-6-72/);
  assert.match(smoke,/6–72 caracteres/);
  assert.match(smoke,/10–72 caracteres/);
  assert.match(smoke,/stale registration HTML detected/);
});
