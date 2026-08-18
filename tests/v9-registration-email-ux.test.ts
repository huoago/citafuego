import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

test('V9 email auth callbacks stay on the requesting production CitaFuego host',()=>{
  const origin=read('src/lib/auth/request-origin.ts');
  const register=read('src/app/api/auth/register/route.ts');
  const login=read('src/app/api/auth/login/route.ts');
  assert.match(origin,/citafuego\.com/);
  assert.match(origin,/www\.citafuego\.com/);
  assert.match(register,/getAuthRequestOrigin\(request\)/);
  assert.match(login,/getAuthRequestOrigin\(request\)/);
  assert.match(register,/auth\/confirm\?flow=register/);
  assert.match(login,/auth\/confirm\?flow=login/);
  assert.doesNotMatch(register,/NEXT_PUBLIC_APP_URL/);
  assert.doesNotMatch(login,/NEXT_PUBLIC_APP_URL/);
});

test('V9 callback distinguishes PKCE browser mismatch and disables caching',()=>{
  const confirm=read('src/app/auth/confirm/route.ts');
  assert.match(confirm,/authFailure:'code_exchange'\|'otp_verify'\|'missing'/);
  assert.match(confirm,/flow==='register'&&authFailure==='code_exchange'/);
  assert.match(confirm,/browser_mismatch/);
  assert.match(confirm,/Cache-Control','private, no-store'/);
  assert.match(confirm,/Pragma','no-cache'/);
});

test('V11 registration form recovers from network errors and constrains age before submit',()=>{
  const form=read('src/components/auth/register-form.tsx');
  assert.match(form,/try\{/);
  assert.match(form,/catch\{/);
  assert.match(form,/finally\{/);
  assert.match(form,/adultMaxDate/);
  assert.match(form,/min="1900-01-01"/);
  assert.match(form,/max=\{adultMaxDate\(\)\}/);
  assert.match(form,/target="_blank" rel="noreferrer"/);
  assert.match(form,/authEmailSent/);
  assert.match(form,/Usar otro correo o reenviar/);
});

test('V9 auth UI contains no disabled-provider or Supabase readiness jargon',()=>{
  const register=read('src/app/(auth)/registro/page.tsx');
  const login=read('src/app/(auth)/iniciar-sesion/page.tsx');
  const switcher=read('src/components/auth/auth-method-switcher.tsx');
  for(const source of [register,login,switcher]){
    assert.doesNotMatch(source,/proveedores alternativos/i);
    assert.doesNotMatch(source,/Supabase confirma/i);
    assert.doesNotMatch(source,/No disponible/);
  }
  assert.match(switcher,/filter\(item=>available\[item\]\)/);
});

test('V11 mobile registration styles stay scoped and preserve legal consent',()=>{
  const css=read('src/app/registration-v9.css');
  const form=read('src/components/auth/register-form.tsx');
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/\.authCardRegistration\{padding:24px 18px 22px/);
  assert.match(css,/\.legalGroup/);
  assert.match(form,/acceptedTerms/);
  assert.match(form,/acceptedPrivacy/);
  assert.match(form,/acceptedSensitive/);
});
