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

test('blocked activation routes users to missing photo or verification steps',()=>{
  assert.match(flow,/if\(approved<2\).*setStep\(2\)/s);
  assert.match(flow,/if\(!verified\).*setStep\(3\)/s);
  assert.match(flow,/Añadir fotos para continuar/);
  assert.match(flow,/Completar verificación/);
});

test('activation UI exposes a readable checklist instead of one dense sentence',()=>{
  for(const token of ['activationChecklist','activationRequirement','Fotos aprobadas','Verificación','Consentimientos','activationSummary'])assert.match(flow,new RegExp(token));
  assert.match(css,/\.activationRequirement\.isReady/);
  assert.match(css,/\.activationRequirement\.isPending/);
  assert.match(css,/color:#fff9fc/);
  assert.match(css,/\.onboardingNotice\{color:#fff!important/);
  assert.match(layout,/v18-activation-ux\.css/);
});
