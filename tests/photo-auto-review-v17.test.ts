import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const visual=read('src/lib/moderation/vercel-ai-visual.ts');
const adapter=read('src/lib/adapters/moderation.ts');
const complete=read('src/app/api/media/profile-photo/complete/route.ts');
const readiness=read('src/app/api/media/moderation/readiness/route.ts');
const css=read('src/app/v17-photo-review.css');
const layout=read('src/app/layout.tsx');
const smoke=read('e2e/production-smoke.mjs');

test('profile photos use Vercel OIDC visual moderation without a long-lived provider key',()=>{
  assert.match(complete,/getVercelRequestOidcToken\(request\)/);
  assert.match(complete,/getProfilePhotoModerationProvider\(oidcToken\)/);
  assert.match(adapter,/VercelAIProfilePhotoModerationProvider/);
  assert.match(visual,/https:\/\/ai-gateway\.vercel\.sh\/v1\/chat\/completions/);
  assert.match(visual,/authorization:`Bearer \$\{input\.token\}`/);
  assert.match(visual,/data:\$\{input\.mimeType/);
  assert.doesNotMatch(visual,/AI_GATEWAY_API_KEY/);
});

test('automatic review is conservative: clear safe may pass, ambiguity falls back to human review',()=>{
  assert.match(visual,/const clearlySafe=/);
  assert.match(visual,/adult_person>=\.78/);
  assert.match(visual,/real_photo>=\.72/);
  assert.match(visual,/const action:ModerationDecision\['action'\]=block\?'block':clearlySafe\?'allow':'hold'/);
  assert.match(visual,/age_uncertain_or_minor/);
  assert.match(visual,/synthetic_or_impersonation/);
  assert.match(visual,/humanReviewRequired:action==='hold'/);
  assert.match(complete,/status===\'pending\'\?'human_fallback':\'automated\'/);
});

test('production exposes and enforces automatic profile-photo review readiness',()=>{
  assert.match(readiness,/checkVercelVisualModerationReadiness/);
  assert.match(readiness,/profilePhotoAutoReview:readiness\.ready/);
  assert.match(smoke,/\/api\/media\/moderation\/readiness/);
  assert.match(smoke,/profilePhotoAutoReview!==true/);
});

test('verification controls remain readable on dark surfaces',()=>{
  assert.match(css,/\.onboardingCard \.ctaButton/);
  assert.match(css,/color:#fff!important/);
  assert.match(css,/\.onboardingCard \.softButton/);
  assert.match(css,/\.verificationChallenge/);
  assert.match(css,/\.verificationChallenge p/);
  assert.match(css,/button:disabled/);
  assert.match(layout,/v17-photo-review\.css/);
});
