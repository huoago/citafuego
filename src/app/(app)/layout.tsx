import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { MobileShell } from '@/components/mobile-shell';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({children}:{children:ReactNode}){
  const s=await createClient();
  const{data:{user}}=await s.auth.getUser();
  if(!user)redirect('/iniciar-sesion');
  const[{data:privateRow},{data:p},{count}]=await Promise.all([
    s.from('user_private').select('user_id').eq('user_id',user.id).maybeSingle(),
    s.from('profiles').select('status').eq('id',user.id).maybeSingle(),
    s.from('user_notifications').select('id',{count:'exact',head:true}).eq('user_id',user.id).is('read_at',null),
  ]);
  if(!privateRow)redirect('/registro/completar');
  if(!p||p.status==='onboarding')redirect('/onboarding');
  if(p.status!=='active')redirect('/cuenta-restringida');
  return <MobileShell unreadNotifications={count??0}>{children}</MobileShell>;
}
