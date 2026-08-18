import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

test('V9.2 email signup defaults closed until production email is explicitly ready',()=>{
  const readiness=read('src/lib/auth/provider-readiness.ts');
  assert.match(readiness,/EMAIL_AUTH_PRODUCTION_READY==='true'/);
  assert.match(readiness,/emailRegistration:false/);
  assert.match(readiness,/emailRegistration:isEmailRegistrationProductionReady\(\)/);
});

test('V9.2 registration hides email while login keeps email available',()=>{
  const switcher=read('src/components/auth/auth-method-switcher.tsx');
  assert.match(switcher,/email:mode==='login'\|\|readiness\.emailRegistration/);
  assert.match(switcher,/phone:readiness\.phone/);
  assert.match(switcher,/google:readiness\.google/);
});

test('V9.2 backend rejects direct email signup when production email is not ready',()=>{
  const route=read('src/app/api/auth/register/route.ts');
  assert.match(route,/if\(!isEmailRegistrationProductionReady\(\)\)/);
  assert.match(route,/email_registration_unavailable/);
  assert.ok(route.indexOf('isEmailRegistrationProductionReady()')<route.indexOf('signInWithOtp'));
});

test('V9.2 registration copy follows the actual available production methods',()=>{
  const page=read('src/app/(auth)/registro/page.tsx');
  assert.match(page,/registrationIntro/);
  assert.match(page,/Regístrate con tu número de celular/);
  assert.match(page,/readiness\.phone&&readiness\.emailRegistration/);
  assert.match(page,/readiness\.emailRegistration/);
});

test('V9.2 production receipt records deployed email registration state',()=>{
  const workflow=read('.github/workflows/production-deploy.yml');
  assert.match(workflow,/id: deployed_auth/);
  assert.match(workflow,/emailRegistration===true\?'enabled':'disabled'/);
  assert.match(workflow,/EMAIL_REGISTRATION: \$\{\{ steps\.deployed_auth\.outputs\.email_registration \}\}/);
  assert.match(workflow,/Email registration: \$\{process\.env\.EMAIL_REGISTRATION\}/);
});
