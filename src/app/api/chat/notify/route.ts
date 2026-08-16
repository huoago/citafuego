import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';
const schema=z.object({conversationId:z.string().uuid()});
export async function POST(request:Request){if(!await getAuthenticatedUserId())return Response.json({error:'unauthorized'},{status:401});const p=schema.safeParse(await request.json());if(!p.success)return Response.json({error:'invalid_payload'},{status:400});const s=await createClient();const{data,error}=await s.rpc('notify_device_message',{p_conversation:p.data.conversationId});if(error)return Response.json({error:'notification_failed'},{status:403});return Response.json(data)}
