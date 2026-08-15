import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';
export async function POST(){if(!await getAuthenticatedUserId())return Response.json({error:'unauthorized'},{status:401});const s=await createClient();const{data,error}=await s.rpc('refresh_profile_activation');if(error)return Response.json({error:'activation_failed'},{status:400});return Response.json({activation:data});}
