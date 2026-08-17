import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const page=readFileSync(join(root,'src/app/page.tsx'),'utf8');
const css=readFileSync(join(root,'src/app/home.module.css'),'utf8');

test('public homepage presents the mature CitaFuego product story',()=>{
  for(const phrase of [
    'Conoce personas.',
    'Verified & Safety',
    'P2P private chat',
    'Random Connect',
    'For You · Stories · Blog',
    'Private Album',
    'Match Intelligence',
    'CitaFuego Premium',
    'Safety + privacy',
  ]) assert.match(page,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('homepage keeps key claims accurate and avoids fake-user presentation',()=>{
  assert.match(page,/Vista del producto · datos de ejemplo/);
  assert.match(page,/contenido no persistido por CitaFuego/);
  assert.match(page,/Solo para personas adultas de 18 años o más/);
  assert.doesNotMatch(page,/Perfiles reales/);
});

test('homepage remains responsive and has distinct mobile rules',()=>{
  assert.match(css,/@media\(max-width:1000px\)/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/grid-template-columns:1fr/);
});
