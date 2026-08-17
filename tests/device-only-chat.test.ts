import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const read=(p:string)=>readFileSync(p,'utf8');

test('primary matched chat uses durable synced messaging',()=>{
 const page=read('src/app/(app)/chats/[conversationId]/page.tsx');
 assert.match(page,/ServerChat/);
 assert.match(page,/from\('messages'\)/);
 assert.doesNotMatch(page,/DeviceOnlyChat/);
});

test('message API requires auth, validates conversations and persists through trusted RPC',()=>{
 const api=read('src/app/api/messages/route.ts');
 assert.match(api,/getAuthenticatedUserId/);
 assert.match(api,/get_conversation_header/);
 assert.match(api,/submit_message/);
 assert.match(api,/preModerateText/);
 assert.match(api,/message_rate_limited/);
 assert.match(api,/conversation_unavailable/);
});

test('synced client supports optimistic send, offline delivery refresh and failure recovery',()=>{
 const chat=read('src/components/chat/server-chat.tsx');
 assert.match(chat,/clientMessageId=crypto\.randomUUID/);
 assert.match(chat,/setInterval/);
 assert.match(chat,/\/api\/messages/);
 assert.match(chat,/setText\(value\)/);
 assert.match(chat,/Retenido/);
});

test('chat inbox uses server message previews rather than device-only IndexedDB previews',()=>{
 const inbox=read('src/app/(app)/chats/page.tsx');
 assert.match(inbox,/last_message_preview/);
 assert.match(inbox,/last_message_at/);
 assert.doesNotMatch(inbox,/LocalChatList/);
});

test('legacy private P2P implementation may remain isolated but is not the primary conversation UI',()=>{
 const legacy=read('src/components/chat/device-only-chat.tsx');
 assert.match(legacy,/RTCPeerConnection/);
 assert.match(legacy,/AES|DeviceOnlyChat/);
 const page=read('src/app/(app)/chats/[conversationId]/page.tsx');
 assert.doesNotMatch(page,/device-only-chat/);
});
