import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';
const schema=z.union([z.object({id:z.string().uuid()}),z.object({all:z.literal(true)})]);
export async function PATCH(request:Request){const userId=await getAuthenticatedUserId();if(!userId)return Response.json({error:'unauthorized'},{status:401});const p=schema.safeParse(await request.json());if(!p.success)return Response.json({error:'invalid_payload'},{status:400});const s=await createClient();let q=s.from('user_notifications').update({read_at:new Date().toISOString()}).eq('user_id',userId).is('read_at',null);if('id'in p.data)q=q.eq('id',p.data.id);const{error}=await q;if(error)return Response.json({error:'notification_update_failed'},{status:400});return Response.json({ok:true})}
