import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { RandomSession } from '@/components/random/random-session';
import type { RandomMode } from '@/lib/types';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{sessionId:string}>}){const{sessionId}=await params;const userId=await getAuthenticatedUserId();if(!userId)notFound();const s=await createClient();const{data,error}=await s.rpc('get_random_session',{p_session:sessionId});const row=(data as any[]|null)?.[0];if(error||!row)notFound();return <RandomSession sessionId={String(row.session_id)} mode={String(row.mode) as RandomMode} peerId={String(row.peer_id)} peerName={String(row.peer_name)} isCaller={Boolean(row.is_caller)} userId={userId}/>}
