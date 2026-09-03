import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync,readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');
const migration='supabase/migrations/20260903060000_profile_contact_photo_referral_fixes.sql';

test('WhatsApp owner can persist only the new contact fields behind existing RLS',()=>{
  const sql=read(migration);
  assert.match(sql,/grant update \(whatsapp_e164, whatsapp_public\) on public\.user_private to authenticated/);
  const api=read('src/app/api/profile/whatsapp/route.ts');
  assert.match(api,/\.select\('whatsapp_e164,whatsapp_public'\)/);
  assert.match(api,/saved:true/);
});

test('profile photos have an authenticated owner-scoped delete path and visible control',()=>{
  const sql=read(migration);
  assert.match(sql,/remove_own_profile_photo/);
  assert.match(sql,/where id=p_photo and user_id=v_user/);
  assert.match(sql,/status='removed'/);
  const api=read('src/app/api/profile/photos/route.ts');
  assert.match(api,/export async function DELETE/);
  assert.match(api,/remove_own_profile_photo/);
  assert.match(api,/storage\.from\('profile-photos'\)\.remove/);
  assert.match(read('src/components/profile/photo-manager.tsx'),/>Eliminar</);
});

test('community guidelines exposes a safe back control',()=>{
  assert.equal(existsSync('src/components/navigation/back-button.tsx'),true);
  const page=read('src/app/community-guidelines/page.tsx');
  assert.match(page,/BackButton/);
  assert.match(page,/label="Volver"/);
});

test('social profile is media-first and makes explicitly shared contact prominent',()=>{
  const page=read('src/app/(app)/perfil/[userId]/page.tsx');
  assert.match(page,/DirectoryProfileGallery/);
  assert.match(page,/pkProfileHero/);
  assert.match(page,/pkContact/);
  assert.match(page,/bundle\.whatsapp\?/);
  assert.match(page,/Número publicado voluntariamente por esta persona/);
  assert.match(page,/no comparte WhatsApp públicamente/);
  assert.doesNotMatch(page,/auth\.users|phone_e164|email/i);
});

test('one confirmed referral earns a stackable seven-day city priority period',()=>{
  const sql=read(migration);
  assert.match(sql,/interval '7 days'/);
  assert.match(sql,/source='referral'/);
  assert.match(sql,/max\(ends_at\)/);
  assert.match(sql,/Invitación confirmada/);
  assert.match(sql,/durante 7 días/);
  assert.doesNotMatch(sql,/interval '1 day'/);
  assert.match(read('src/proxy.ts'),/cf_ref/);
  assert.match(read('src/app/api/onboarding/activate/route.ts'),/claim_referral_reward/);
  assert.equal(existsSync('src/app/(app)/invitar/page.tsx'),true);
});

test('personal profile shows the account unique referral link directly',()=>{
  const page=read('src/app/(app)/perfil/page.tsx');
  assert.match(page,/get_my_referral_code/);
  assert.match(page,/ReferralShare/);
  assert.match(page,/registro\?ref=/);
  assert.match(page,/Este enlace es exclusivo de tu cuenta/);
  assert.match(page,/7 días de prioridad/);
  assert.match(page,/amigos registrados y confirmados/);
  assert.match(page,/referral_attributions/);
});

test('referral reward wording requires a valid registration from the invite link',()=>{
  const invite=read('src/app/(app)/invitar/page.tsx');
  assert.match(invite,/registro válido/);
  assert.match(invite,/crear una cuenta nueva de adulto y activar su perfil/);
  assert.match(invite,/registros que no hayan llegado desde tu enlace/);
});
