import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { MobileShell } from '@/components/mobile-shell';
import { createClient } from '@/lib/supabase/server';
export default async function AppLayout({children}:{children:ReactNode}){const s=await createClient();const{data:c}=await s.auth.getClaims();const id=c?.claims?.sub;if(typeof id!=='string')redirect('/iniciar-sesion');const[{data:p},{count}]=await Promise.all([s.from('profiles').select('status').eq('id',id).maybeSingle(),s.from('user_notifications').select('id',{count:'exact',head:true}).eq('user_id',id).is('read_at',null)]);if(!p||p.status==='onboarding')redirect('/onboarding');if(p.status!=='active')redirect('/cuenta-restringida');return <MobileShell unreadNotifications={count??0}>{children}</MobileShell>}
