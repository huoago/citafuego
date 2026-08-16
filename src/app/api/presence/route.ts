import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';
export async function POST(){if(!await getAuthenticatedUserId())return Response.json({error:'unauthorized'},{status:401});const s=await createClient();const{data,error}=await s.rpc('touch_presence');if(error)return Response.json({error:'presence_failed'},{status:400});return Response.json({ok:true,at:data});}
