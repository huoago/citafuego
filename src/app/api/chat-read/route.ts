import {z} from 'zod';
import {getAuthenticatedUserId} from '@/lib/auth/server';
import {createClient} from '@/lib/supabase/server';

const markSchema=z.object({conversationId:z.string().uuid(),messageId:z.string().uuid()});

export async function GET(){
  const userId=await getAuthenticatedUserId();
  if(!userId)return Response.json({error:'unauthorized'},{status:401});
  const s=await createClient();
  const{data,error}=await s.rpc('get_my_unread_chat_count');
  if(error)return Response.json({error:'unread_unavailable'},{status:500});
  return Response.json({unreadCount:Number(data??0)},{headers:{'cache-control':'no-store'}});
}

export async function POST(request:Request){
  const userId=await getAuthenticatedUserId();
  if(!userId)return Response.json({error:'unauthorized'},{status:401});
  const payload=markSchema.safeParse(await request.json().catch(()=>null));
  if(!payload.success)return Response.json({error:'invalid_payload'},{status:400});
  const s=await createClient();
  const{data,error}=await s.rpc('mark_conversation_read',{p_conversation:payload.data.conversationId,p_message:payload.data.messageId});
  if(error){
    const map:[string,number][]=[['not_authenticated',401],['conversation_unavailable',403],['invalid_read_cursor',400]];
    const hit=map.find(([key])=>error.message.includes(key));
    return Response.json({error:hit?.[0]??'read_state_failed'},{status:hit?.[1]??400});
  }
  return Response.json({unreadCount:Number(data??0)},{headers:{'cache-control':'no-store'}});
}
