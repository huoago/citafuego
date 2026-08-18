import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

test('V9.1 normalizes human-formatted phone numbers for both SMS request and verification',()=>{
  const request=read('src/app/api/auth/phone/request/route.ts');
  const verify=read('src/app/api/auth/phone/verify/route.ts');
  const form=read('src/components/auth/phone-auth-form.tsx');
  for(const source of [request,verify]){
    assert.match(source,/replace\(\/\[\\s\(\)\.\-\]\/g,''\)/);
    assert.match(source,/\^\\\+\[1-9\]\\d\{7,14\}\$/);
  }
  assert.match(form,/normalizePhone/);
  assert.match(form,/phone:normalizedPhone/);
  assert.match(form,/setPhone\(normalizedPhone\)/);
  assert.match(form,/Puedes escribirlo con espacios/);
});

test('V9.1 email auth APIs reject malformed JSON without throwing',()=>{
  const register=read('src/app/api/auth/register/route.ts');
  const login=read('src/app/api/auth/login/route.ts');
  assert.match(register,/request\.json\(\)\.catch\(\(\)=>null\)/);
  assert.match(login,/request\.json\(\)\.catch\(\(\)=>null\)/);
});

test('V9.1 distinguishes registration rate limiting from temporary service failure',()=>{
  const route=read('src/app/api/auth/register/route.ts');
  const form=read('src/components/auth/register-form.tsx');
  assert.match(route,/error\.status===429/);
  assert.match(route,/registration_rate_limited/);
  assert.match(route,/registration_unavailable/);
  assert.match(route,/status:503/);
  assert.match(form,/registration_rate_limited/);
  assert.match(form,/Has solicitado varios enlaces/);
});

test('V9.1 pending registration validates semantic dates and 18+ before RPC',()=>{
  const route=read('src/app/api/auth/complete-registration/route.ts');
  assert.match(route,/parseIsoDate/);
  assert.match(route,/isAdultBirthDate/);
  assert.match(route,/adult_only/);
  assert.match(route,/complete_pending_registration/);
  assert.ok(route.indexOf('isAdultBirthDate')<route.indexOf("s.rpc('complete_pending_registration'"));
});
