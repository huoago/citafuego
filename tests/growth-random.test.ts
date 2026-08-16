import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync,readFileSync } from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');
const growth=()=>read('supabase/migrations/032_growth_random_match.sql');

test('growth migration adds prompts notifications behavior learning and boost',()=>{const s=growth();for(const token of ['profile_prompts','user_notifications','get_discover_page_v3','profile_impression','activate_profile_boost','is_online','is_boosted'])assert.match(s,new RegExp(token));});
test('random matching is verified-only, block-aware and has all three modes',()=>{const s=growth();assert.match(s,/verified_profile_required/);assert.match(s,/public\.blocks/);for(const mode of ['text','voice','video'])assert.match(s,new RegExp(`'${mode}'`));assert.match(s,/random_match_sessions/);assert.match(s,/random_chat_messages/);assert.match(s,/random_signals/);});
test('random privileged functions revoke anonymous execution',()=>{const s=growth();for(const fn of ['join_random_match','get_random_session','leave_random_match','submit_random_message'])assert.match(s,new RegExp(`revoke all on function public\\.${fn}`));assert.match(read('supabase/migrations/033_random_queue_cancel.sql'),/revoke all on function public\.cancel_random_queue\(\) from public,anon/);});
test('voice and video use browser WebRTC with local media permissions',()=>{const s=read('src/components/random/random-session.tsx');assert.match(s,/RTCPeerConnection/);assert.match(s,/getUserMedia/);assert.match(s,/onicecandidate/);assert.match(read('next.config.ts'),/camera=\(self\).*microphone=\(self\)/);});
test('TURN credentials stay server-only and are optional',()=>{const ice=read('src/app/api/random/ice/route.ts');assert.match(ice,/process\.env\.TURN_URL/);assert.doesNotMatch(ice,/NEXT_PUBLIC_TURN/);assert.match(ice,/stun:stun\.l\.google\.com/);});
test('new product surfaces have dedicated routes',()=>{for(const p of ['src/app/(app)/azar/page.tsx','src/app/(app)/azar/[sessionId]/page.tsx','src/app/(app)/perfil/prompts/page.tsx','src/app/(app)/perfil/fotos/page.tsx','src/app/(app)/notificaciones/page.tsx','src/app/(app)/boost/page.tsx'])assert.equal(existsSync(p),true,p);});
test('profile prompts are moderated before public save',()=>{const s=read('src/app/api/profile/prompts/route.ts');assert.match(s,/surface:'prompt'/);assert.match(s,/moderateText/);assert.match(s,/prompt_moderation_failed/);});
test('random text is moderated before database delivery',()=>{const s=read('src/app/api/random/messages/route.ts');assert.match(s,/moderateText/);assert.match(s,/message_blocked/);assert.match(s,/submit_random_message/);});
test('behavior events are authenticated and whitelisted',()=>{const s=read('src/app/api/analytics/route.ts');assert.match(s,/getAuthenticatedUserId/);assert.match(s,/profile_impression/);assert.match(s,/random_matched/);assert.match(s,/boost_started/);});
