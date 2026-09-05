import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const migration=readFileSync('supabase/migrations/078_optional_photo_verification_trust.sql','utf8');
const flow=readFileSync('src/components/onboarding/onboarding-flow.tsx','utf8');
const serialize=readFileSync('src/lib/discovery/serialize.ts','utf8');
const trust=readFileSync('src/components/profile/trust-mark.tsx','utf8');
const ownProfile=readFileSync('src/app/(app)/perfil/page.tsx','utf8');
const discover=readFileSync('src/components/discover-deck.tsx','utf8');
const theme=readFileSync('src/app/v19-trust-theme.css','utf8');
const layout=readFileSync('src/app/layout.tsx','utf8');

test('database activation keeps adult, name, consent and sanction gates but drops photo/selfie gates',()=>{
  assert.match(migration,/v_active:=public\.is_adult\(v_birth\)/);
  assert.match(migration,/v_terms and v_privacy and v_sensitive/);
  assert.match(migration,/not v_sanctioned/);
  const activationBlock=migration.match(/v_active:=public\.is_adult[\s\S]*?;/)?.[0]??'';
  assert.doesNotMatch(activationBlock,/v_photos\s*>?=/);
  assert.doesNotMatch(activationBlock,/verification_badge/);
});

test('discovery no longer requires a photo and serializer supplies a neutral placeholder',()=>{
  assert.doesNotMatch(migration,/and photo\.storage_path is not null/);
  assert.match(serialize,/return rows\.map/);
  assert.doesNotMatch(serialize,/rows\.filter\(/);
  assert.match(serialize,/profile-placeholder\.svg/);
  assert.match(serialize,/hasPhoto/);
});

test('onboarding labels photos and verification as optional trust upgrades',()=>{
  assert.match(flow,/Opcional · confianza/);
  assert.match(flow,/Continuar sin fotos/);
  assert.match(flow,/Continuar sin verificar/);
  assert.match(flow,/Confianza avanzada/);
});

test('trust marker has distinct photo, verified and advanced states and appears on avatars/discover',()=>{
  for(const token of ['trustPhoto','trustVerified','trustAdvanced'])assert.match(trust,new RegExp(token));
  assert.match(trust,/hasPhoto&&verified/);
  assert.match(ownProfile,/profileAvatarWrap/);
  assert.match(ownProfile,/<TrustMark/);
  assert.match(discover,/<TrustMark/);
});

test('V19 is loaded after activation UX and provides the canonical accessible light trust surface',()=>{
  assert.match(layout,/v18-activation-ux\.css';\nimport '\.\/v19-trust-theme\.css'/);
  assert.match(theme,/\.onboardingCard,\.activationCard,\.trustStepCard/);
  assert.match(theme,/background:linear-gradient\(180deg,#fff 0%,#fbfcfe 100%\)!important/);
  assert.match(theme,/--cf19-text:#111827/);
  assert.match(theme,/--cf19-bg:#ffffff/);
  assert.match(theme,/body\{color-scheme:light\}/);
  assert.match(theme,/\.appCanvas,\.mobileShell,\.iosAppShell,\.appMain/);
  assert.match(theme,/\.profileSummary,\.profileCompletionPrompt,\.settingsSection/);
});
