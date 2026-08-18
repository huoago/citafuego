import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

test('V11 hides SMS unless both provider and explicit production gate are ready',()=>{
  const readiness=read('src/lib/auth/provider-readiness.ts');
  assert.match(readiness,/PHONE_AUTH_PRODUCTION_READY==='true'/);
  assert.match(readiness,/isPhoneAuthProductionReady\(\)&&Boolean\(smsProvider/);
});

test('V11 email registration requires verified OTP delivery mode',()=>{
  const readiness=read('src/lib/auth/provider-readiness.ts');
  assert.match(readiness,/EMAIL_AUTH_PRODUCTION_READY==='true'/);
  assert.match(readiness,/EMAIL_AUTH_DELIVERY_MODE==='otp_code'/);
});

test('V11 requests a six digit email code with legal metadata and keeps legacy callback compatibility',()=>{
  const route=read('src/app/api/auth/register/route.ts');
  assert.match(route,/signInWithOtp/);
  assert.match(route,/shouldCreateUser:true/);
  assert.match(route,/birth_date/);
  assert.match(route,/terms_version/);
  assert.match(route,/privacy_version/);
  assert.match(route,/sensitive_data_version/);
  assert.match(route,/auth\/confirm\?flow=register/);
  assert.match(route,/delivery:'otp_code'/);
  assert.match(route,/código de 6 dígitos/);
});

test('V11 verifies the email OTP and establishes the SSR auth session',()=>{
  const route=read('src/app/api/auth/register/verify/route.ts');
  assert.match(route,/verifyOtp/);
  assert.match(route,/type:'email'/);
  assert.match(route,/\^\\d\{6\}\$/);
  assert.match(route,/getUser\(\)/);
  assert.match(route,/next:'\/onboarding'/);
});

test('V11 registration UI is code-first, passwordless and does not recommend broken SMS',()=>{
  const form=read('src/components/auth/register-form.tsx');
  assert.match(form,/Recibir código por correo/);
  assert.match(form,/autoComplete="one-time-code"/);
  assert.match(form,/maxLength=\{6\}/);
  assert.match(form,/Verificar y crear cuenta/);
  assert.match(form,/Usar otro correo o reenviar/);
  assert.doesNotMatch(form,/Usa el registro por teléfono/);
  assert.doesNotMatch(form,/type="password"/);
});

test('V11 registration styles use explicit high contrast surfaces and text',()=>{
  const css=read('src/app/registration-v9.css');
  assert.match(css,/\.authRegistrationPage/);
  assert.match(css,/\.authCardRegistration\{[^}]*background:#181010[^}]*color:#fff7f2/);
  assert.match(css,/background:#0b0707;color:#fff7f2/);
  assert.match(css,/\.legalGroup\{[^}]*background:#211515/);
  assert.match(css,/\.formError\{[^}]*background:#3a1718[^}]*color:#ffe7e5/);
  assert.match(css,/min-height:100dvh/);
});
