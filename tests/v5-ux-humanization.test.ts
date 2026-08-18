import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

test('V5 keeps one semantic job per global navigation control',()=>{
  const shell=read('src/components/mobile-shell.tsx');
  const nav=read('src/components/bottom-nav.tsx');
  assert.match(shell,/Crear contenido/);
  assert.doesNotMatch(shell,/homeAction|href="\/azar"/);
  assert.match(nav,/<svg/);
});

test('V5 restores vertical scrolling and limits card gestures to horizontal decisions',()=>{
  const deck=read('src/components/discover-deck.tsx');
  const css=read('src/app/auth-safety-v3.css');
  assert.match(deck,/Math\.abs\(dx\)>=72/);
  assert.doesNotMatch(deck,/dy<=-76|dy>=76/);
  assert.match(css,/immersiveProfileMedia\{touch-action:pan-y\}/);
});

test('V5 never forces chat navigation immediately after a Match',()=>{
  const deck=read('src/components/discover-deck.tsx');
  assert.match(deck,/setMatch\(/);
  assert.match(deck,/Seguir descubriendo/);
  assert.match(deck,/Enviar mensaje/);
  assert.doesNotMatch(deck,/setTimeout\(\(\)=>router\.push/);
});

test('V5 keeps commercial tools out of the main profile',()=>{
  const profile=read('src/app/(app)/perfil/page.tsx');
  const more=read('src/app/(app)/perfil/mas/page.tsx');
  assert.doesNotMatch(profile,/href="\/(?:boost|tienda|anunciantes)"/);
  assert.match(profile,/Más ajustes y herramientas/);
  assert.match(more,/href="\/boost"/);
  assert.match(more,/href="\/tienda"/);
  assert.match(more,/href="\/anunciantes"/);
});

test('V5 reporting flow offers optional immediate blocking',()=>{
  const safety=read('src/components/safety/safety-actions.tsx');
  assert.match(safety,/setPostReport\(true\)/);
  assert.match(safety,/Bloquear también/);
  assert.match(safety,/Gracias por avisarnos/);
});
