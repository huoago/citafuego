import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');

test('user verification is selfie-only and document KYC is disabled',()=>{
  const page=read('src/app/(app)/perfil/verificacion-foto/page.tsx');
  const legacyPage=read('src/app/(app)/perfil/verificacion-identidad/page.tsx');
  const legacyStart=read('src/app/api/identity/veriff/start/route.ts');
  const legacyDecision=read('src/app/api/providers/veriff/decision/route.ts');
  assert.match(page,/Verificación de foto real/);
  assert.match(page,/ya no solicita DNI, pasaporte/);
  assert.match(legacyPage,/redirect\('\/perfil\/verificacion-foto'\)/);
  assert.match(legacyStart,/document_identity_verification_disabled/);
  assert.match(legacyStart,/status:410/);
  assert.doesNotMatch(legacyStart,/createVeriffSession/);
  assert.doesNotMatch(legacyDecision,/identity_verification_badge/);
  assert.doesNotMatch(legacyDecision,/dateOfBirth/);
});

test('verification selfie uploads only to the private verification evidence bucket',()=>{
  const flow=read('src/components/verification/real-photo-verification.tsx');
  assert.match(flow,/\/api\/verification\/start/);
  assert.match(flow,/\/api\/verification\/upload/);
  assert.match(flow,/\/api\/verification\/complete/);
  assert.match(flow,/storage\.from\('verification-selfies'\)/);
  assert.doesNotMatch(flow,/storage\.from\('profile-photos'\)/);
  assert.match(flow,/No aparecerá en tu perfil, fotos ni álbumes/);
});

test('only Trust and Safety backoffice renders verification evidence and deletes it after review',()=>{
  const adminPage=read('src/app/admin/verifications/page.tsx');
  const adminDecision=read('src/app/api/admin/verification/[sessionId]/route.ts');
  assert.match(adminPage,/requireAdmin\(\['super_admin','trust_safety'\]\)/);
  assert.match(adminPage,/\.eq\('provider','manual_selfie'\)/);
  assert.match(adminPage,/storage\.from\('verification-selfies'\)\.createSignedUrl\(selfie,300\)/);
  assert.match(adminPage,/Evidencia privada/);
  assert.match(adminDecision,/requireAdmin\(\['super_admin','trust_safety'\]\)/);
  assert.match(adminDecision,/storage\.from\('verification-selfies'\)\.remove\(\[path\]\)/);
});

test('database migration removes document badge exposure and owner selfie reads',()=>{
  const migration=read('supabase/migrations/20260903032100_disable_document_identity_keep_private_selfie.sql');
  assert.match(migration,/set identity_verification_badge=false/);
  assert.match(migration,/provider='veriff' and status='pending'/);
  assert.match(migration,/select p\.id,p\.verification_badge,false/);
  assert.match(migration,/drop policy if exists verification_selfie_private_select/);
});
