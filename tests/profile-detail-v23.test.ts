import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const page=readFileSync(join(root,'src/app/(app)/perfil/[userId]/page.tsx'),'utf8');
const css=readFileSync(join(root,'src/app/profile-detail.css'),'utf8');
const layout=readFileSync(join(root,'src/app/layout.tsx'),'utf8');

test('profile detail stylesheet is loaded as a semantic layer',()=>{
  assert.match(layout,/import '\.\/profile-detail\.css'/);
  assert.match(page,/data-social-profile-v23/);
});

test('profile hierarchy exposes decision facts before contact and long-form biography',()=>{
  const facts=page.indexOf('data-profile-key-facts');
  const contact=page.indexOf('profile-contact');
  const about=page.indexOf('profile-about-title');
  assert.ok(facts>0);
  assert.ok(contact>facts);
  assert.ok(about>contact);
  for(const label of ['Busca','Zona','Confianza','Actividad']) assert.match(page,new RegExp(`>${label}<`));
  assert.match(page,/Contacto compartido/);
  assert.match(page,/Prioriza CitaFuego/);
});

test('mobile contact toolbar is viewport-fixed, safe-area aware and touch friendly',()=>{
  assert.match(page,/data-mobile-contact-toolbar/);
  assert.match(css,/\.pkMobileActions\[data-mobile-contact-toolbar\]\{[\s\S]*?position:fixed/);
  assert.match(css,/bottom:max\(10px,env\(safe-area-inset-bottom\)\)/);
  assert.match(css,/left:max\(10px,env\(safe-area-inset-left\)\)/);
  assert.match(css,/right:max\(10px,env\(safe-area-inset-right\)\)/);
  assert.match(css,/\.pkMobileAction\{[\s\S]*?min-height:52px/);
  assert.match(css,/padding-bottom:calc\(94px \+ env\(safe-area-inset-bottom\)\)/);
});

test('native CitaFuego contact stays primary and external contact remains voluntary secondary data',()=>{
  assert.match(page,/pkMobileAction primary[^>]*>Mensaje</);
  assert.match(page,/pkMobileAction primary[^>]*>Conectar</);
  assert.match(page,/Número publicado voluntariamente por esta persona/);
  assert.match(page,/Nunca envíes dinero ni compartas claves, códigos o documentos sensibles/);
  assert.doesNotMatch(page,/precio|tarifa|servicio sexual|escort/i);
});
