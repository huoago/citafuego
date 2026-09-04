import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { MobileShell } from '@/components/mobile-shell';
import { createClient } from '@/lib/supabase/server';
import '../interaction.css';
import '../growth.css';
import '../blog.css';
import '../recommendations.css';
import '../monetization.css';
import '../top-tier.css';
import '../ios-social.css';
import '../ios-v2.css';
import '../chat-read-v7.css';
import '../whatsapp-contact.css';
import '../v20-settings-personalization.css';

export default async function AppLayout({children}:{children:ReactNode}){
  const s=await createClient();
  const{data:{user}}=await s.auth.getUser();
  if(!user)redirect('/iniciar-sesion');
  const[{data:privateRow},{data:p},{count},{data:chatUnread}]=await Promise.all([
    s.from('user_private').select('user_id').eq('user_id',user.id).maybeSingle(),
    s.from('profiles').select('status').eq('id',user.id).maybeSingle(),
    s.from('user_notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).is('read_at',null),
    s.rpc('get_my_unread_chat_count'),
  ]);
  // Age/legal registration remains mandatory. Profile completion is optional for browsing the app.
  if(!privateRow)redirect('/registro/completar');
  if(!p)redirect('/onboarding');
  if(['restricted','suspended','banned'].includes(String(p.status)))redirect('/cuenta-restringida');
  return <MobileShell unreadNotifications={count??0} unreadChats={Number(chatUnread??0)}>{children}</MobileShell>;
}
