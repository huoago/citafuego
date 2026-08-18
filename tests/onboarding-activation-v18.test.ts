import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const flow=readFileSync('src/components/onboarding/onboarding-flow.tsx','utf8');
const css=readFileSync('src/app/v18-activation-ux.css','utf8');
const layout=readFileSync('src/app/layout.tsx','utf8');

test('activation sends completed profiles to the real Spanish Discover route',()=>{
  assert.match(flow,/router\.replace\('\/descubrir'\)/);
  assert.doesNotMatch(flow,/router\.(?:push|replace)\('\/discover'\)/);
});

test('activation has visible network and server failure feedback',()=>{
  assert.match(flow,/try\{/);
  assert.match(flow,/catch\{/);
  assert.match(flow,/No pudimos conectar con el servicio de activación/);
  assert.match(flow,/role="status" aria-live="polite"/);
});

test('photos and selfie verification no longer block activation',()=>{
  assert.match(flow,/const activationReady=nameOk&&consentOk/);
  assert.doesNotMatch(flow,/if\(approved<2\).*setStep\(2\)/s);
  assert.doesNotMatch(flow,/if\(!verified\).*setStep\(3\)/s);
  assert.match(flow,/Continuar sin fotos/);
  assert.match(flow,/Continuar sin verificar/);
  assert.match(flow,/Fotos y verificación son mejoras opcionales de confianza/);
});

test('activation UI remains a readable checklist',()=>{
  for(const token of ['activationChecklist','activationRequirement','Fotos','Verificación','Consentimientos','activationSummary'])assert.match(flow,new RegExp(token));
  assert.match(css,/\.activationRequirement\.isReady/);
  assert.match(css,/\.activationRequirement\.isPending/);
  assert.match(layout,/v18-activation-ux\.css/);
  assert.match(layout,/v19-trust-theme\.css/);
});
