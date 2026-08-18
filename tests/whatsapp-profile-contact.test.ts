import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync,readFileSync } from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');

test('WhatsApp number is private by default and only emitted when public',()=>{const s=read('supabase/migrations/076_whatsapp_profile_contact.sql');assert.match(s,/whatsapp_public boolean not null default false/);assert.match(s,/whatsapp_e164/);assert.match(s,/when coalesce\(up\.whatsapp_public,false\).*up\.whatsapp_e164/is);assert.match(s,/left join public\.user_private up/);});
test('WhatsApp save API normalizes E164 and requires auth',()=>{const s=read('src/app/api/profile/whatsapp/route.ts');assert.match(s,/getAuthenticatedUserId/);assert.match(s,/\^\\\+\[1-9\]/);assert.match(s,/visibility:z\.enum\(\['hidden','public'\]\)/);assert.match(s,/number_required/);});
test('profile settings include WhatsApp visibility controls',()=>{assert.equal(existsSync('src/app/(app)/perfil/whatsapp/page.tsx'),true);const s=read('src/components/profile/whatsapp-settings.tsx');assert.match(s,/Oculto/);assert.match(s,/Público/);assert.match(s,/Guardar WhatsApp/);assert.match(s,/https:\/\/wa\.me\//);assert.match(s,/Puedes ocultarlo de nuevo/);});
test('public profile opens WhatsApp only from RPC-provided number',()=>{const page=read('src/app/(app)/perfil/[userId]/page.tsx');const server=read('src/lib/social/server.ts');assert.match(server,/whatsapp:string\|null/);assert.match(server,/root\.whatsapp/);assert.match(page,/bundle\.whatsapp\?/);assert.match(page,/https:\/\/wa\.me\//);assert.match(page,/noopener noreferrer/);});
test('profile exposes settings entry and WhatsApp stylesheet',()=>{assert.match(read('src/app/(app)/perfil/page.tsx'),/\/perfil\/whatsapp/);assert.match(read('src/app/layout.tsx'),/whatsapp-contact\.css/);assert.equal(existsSync('src/app/whatsapp-contact.css'),true);});
