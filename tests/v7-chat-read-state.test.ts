import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

test('V7 stores per-user read cursors behind RLS and RPC-only access',()=>{
  const sql=read('supabase/migrations/072_chat_read_state.sql');
  assert.match(sql,/create table if not exists public\.conversation_reads/);
  assert.match(sql,/primary key \(conversation_id,user_id\)/);
  assert.match(sql,/enable row level security/);
  assert.match(sql,/revoke all on table public\.conversation_reads from public,anon,authenticated/);
  assert.match(sql,/get_my_unread_chat_count/);
  assert.match(sql,/get_my_chat_unread_counts/);
  assert.match(sql,/mark_conversation_read/);
  assert.match(sql,/msg\.sender_id<>v_user/);
  assert.match(sql,/msg\.status='sent'/);
  assert.match(sql,/msg\.created_at>coalesce\(cr\.last_read_at,c\.created_at\)/);
});

test('V7 covers read-state foreign keys used by cleanup and joins',()=>{
  const sql=read('supabase/migrations/073_chat_read_state_indexes.sql');
  assert.match(sql,/conversation_reads_user_idx/);
  assert.match(sql,/conversation_reads\(user_id\)/);
  assert.match(sql,/conversation_reads_last_message_idx/);
  assert.match(sql,/last_read_message_id/);
});

test('V7 read cursor can advance only through a delivered peer message in the active conversation',()=>{
  const sql=read('supabase/migrations/072_chat_read_state.sql');
  assert.match(sql,/if not public\.can_send_message\(p_conversation\)/);
  assert.match(sql,/msg\.id=p_message/);
  assert.match(sql,/msg\.conversation_id=p_conversation/);
  assert.match(sql,/msg\.sender_id<>v_user/);
  assert.match(sql,/invalid_read_cursor/);
  assert.match(sql,/excluded\.last_read_at>public\.conversation_reads\.last_read_at/);
});

test('V7 authenticated API exposes count and cursor updates without direct table access',()=>{
  const route=read('src/app/api/chat-read/route.ts');
  assert.match(route,/getAuthenticatedUserId/);
  assert.match(route,/get_my_unread_chat_count/);
  assert.match(route,/mark_conversation_read/);
  assert.match(route,/cache-control':'no-store/);
});

test('V7 app shell and inbox display durable unread counts',()=>{
  const layout=read('src/app/(app)/layout.tsx');
  const shell=read('src/components/mobile-shell.tsx');
  const nav=read('src/components/bottom-nav.tsx');
  const inbox=read('src/app/(app)/chats/page.tsx');
  assert.match(layout,/get_my_unread_chat_count/);
  assert.match(shell,/initialUnreadChats/);
  assert.match(nav,/\/api\/chat-read/);
  assert.match(nav,/citafuego:chat-unread/);
  assert.match(nav,/navUnreadBadge/);
  assert.match(inbox,/get_my_chat_unread_counts/);
  assert.match(inbox,/chatUnreadCount/);
});

test('V7 marks only a rendered peer sent message as read',()=>{
  const chat=read('src/components/chat/server-chat.tsx');
  assert.match(chat,/message\.sender_id!==userId&&message\.status==='sent'/);
  assert.match(chat,/document\.visibilityState!=='visible'/);
  assert.match(chat,/messageId:latestPeer\.id/);
  assert.match(chat,/citafuego:chat-unread/);
  assert.doesNotMatch(chat,/mark.*Date\.now|read.*Date\.now/i);
});
