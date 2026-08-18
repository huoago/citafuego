import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

test('V12 login page keeps one clear account-first hierarchy',()=>{
  const page=read('src/app/(auth)/iniciar-sesion/page.tsx');
  assert.match(page,/Bienvenido de nuevo/);
  assert.match(page,/Entra con tu cuenta y contraseña o usa otro método disponible/);
  assert.match(page,/Acceso privado/);
  assert.doesNotMatch(page,/authLinkTip/);
  assert.doesNotMatch(page,/Entra con el mismo método/);
  assert.match(page,/login\.module\.css/);
});

test('V12 login prefers account auth then preserves configured SMS and email alternatives',()=>{
  const switcher=read('src/components/auth/auth-method-switcher.tsx');
  assert.match(switcher,/readiness\.account\?'account':mode==='login'&&readiness\.phone\?'phone':'email'/);
  assert.match(switcher,/phone:'Teléfono'/);
  assert.match(switcher,/item==='phone'&&mode==='login'\?'SMS':labels\[item\]/);
  assert.match(switcher,/email:mode==='login'\|\|readiness\.emailRegistration/);
  assert.match(switcher,/Método de acceso/);
});

test('V10 email login keeps email-only guidance inside the email panel',()=>{
  const form=read('src/components/auth/login-form.tsx');
  assert.match(form,/Sin contraseña\. Te enviaremos un enlace de acceso de un solo uso/);
  assert.match(form,/Ábrelo en este mismo navegador/);
  assert.match(form,/loginSentState/);
  assert.match(form,/Usar otro correo/);
  assert.match(form,/maskEmail/);
});

test('V10 SMS login uses the primary action hierarchy and human errors',()=>{
  const phone=read('src/components/auth/phone-auth-form.tsx');
  assert.match(phone,/Enviar código por SMS/);
  assert.match(phone,/className="ctaButton authMethodButton"/);
  assert.match(phone,/El acceso por SMS no está disponible/);
  assert.match(phone,/Cambiar número/);
});

test('V10 login page is mobile-safe and motion-aware',()=>{
  const css=read('src/app/(auth)/iniciar-sesion/login.module.css');
  assert.match(css,/min-height: 100dvh/);
  assert.match(css,/env\(safe-area-inset-top\)/);
  assert.match(css,/min-height: 44px/);
  assert.match(css,/@media \(max-width: 520px\)/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
});

test('V12 production smoke validates only auth methods enabled by live readiness',()=>{
  const smoke=read('e2e/production-smoke.mjs');
  assert.match(smoke,/\/api\/auth\/readiness/);
  assert.match(smoke,/authReadiness\.account/);
  assert.match(smoke,/authReadiness\.phone/);
  assert.match(smoke,/authReadiness\.google/);
  assert.match(smoke,/authReadiness\.emailRegistration/);
  assert.match(smoke,/requireText\(body,path,'Cuenta'\)/);
  assert.match(smoke,/requireText\(body,path,'SMS'\)/);
  assert.doesNotMatch(smoke,/\['Google','teléfono','email'\]/);
});
