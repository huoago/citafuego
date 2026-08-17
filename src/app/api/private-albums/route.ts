import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
const schema=z.object({title:z.string().trim().min(1).max(60)});
export async function GET(){const userId=await getAuthenticatedUserId();if(!userId)return Response.json({error:'unauthorized'},{status:401});const s=await createClient();const{data,error}=await s.rpc('get_private_albums');if(error)return Response.json({error:'albums_unavailable'},{status:500});return Response.json({albums:data??[]});}
export async function POST(request:Request){const userId=await getAuthenticatedUserId();if(!userId)return Response.json({error:'unauthorized'},{status:401});const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:'invalid_payload'},{status:400});const s=await createClient();const{data,error}=await s.rpc('create_private_album',{p_title:parsed.data.title});if(error||!data)return Response.json({error:'album_create_failed'},{status:409});return Response.json({albumId:data},{status:201});}
