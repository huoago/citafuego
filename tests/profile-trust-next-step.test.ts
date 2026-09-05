import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const profile=fs.readFileSync('src/app/(app)/perfil/page.tsx','utf8');

test('profile trust guidance prioritizes an approved first photo without making it mandatory',()=>{
  assert.match(profile,/select\('status'\)\.eq\('user_id',id\)\.neq\('status','removed'\)/);
  assert.match(profile,/approvedPhotoCount/);
  assert.match(profile,/pendingPhotoCount/);
  assert.match(profile,/!hasPhoto[\s\S]*pendingPhotoCount>0[\s\S]*Añade tu primera foto/);
  assert.match(profile,/puedes seguir usando CitaFuego sin subirla/);
  assert.match(profile,/href:'\/perfil\/fotos'/);
});

test('after photo approval the next step is 80 percent completion then optional verification',()=>{
  assert.match(profile,/profile\.profile_completion<80/);
  assert.match(profile,/Lleva tu perfil del \$\{profile\.profile_completion\}% al 80%/);
  assert.match(profile,/No bloquea Descubrir/);
  assert.match(profile,/!verified[\s\S]*Confianza opcional/);
  assert.match(profile,/selfie de verificación es privada, opcional/);
  assert.match(profile,/href:'\/perfil\/verificacion-foto'/);
});

test('trust next step is prominent and outside customizable profile modules',()=>{
  const prompt=profile.indexOf('data-profile-trust-next-step');
  const grid=profile.indexOf('profilePersonalGrid');
  assert.ok(prompt>0&&grid>prompt,'trust next step must render before the customizable module grid');
  assert.match(profile,/nextTrustStep\?<div className="profileCompletionPrompt" data-profile-trust-next-step/);
});
