import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { preModerateText } from '@/lib/domain/moderation';

const conversationSchema=z.string().uuid();
const sendSchema=z.object({conversationId:z.string().uuid(),text:z.string().trim().min(1).max(2000),clientMessageId:z.string().min(6).max(100)});

export async function GET(request:Request){
  const userId=await getAuthenticatedUserId();
  if(!userId)return Response.json({error:'unauthorized'},{status:401});
  const conversationId=new URL(request.url).searchParams.get('conversationId');
  const parsed=conversationSchema.safeParse(conversationId);
  if(!parsed.success)return Response.json({error:'invalid_conversation'},{status:400});
  const s=await createClient();
  const{data:header,error:headerError}=await s.rpc('get_conversation_header',{p_conversation:parsed.data});
  if(headerError||!Array.isArray(header)||!header.length)return Response.json({error:'conversation_not_found'},{status:404});
  const{data,error}=await s.from('messages').select('id,sender_id,body,status,created_at').eq('conversation_id',parsed.data).is('deleted_at',null).order('created_at',{ascending:true}).limit(100);
  if(error)return Response.json({error:'messages_unavailable'},{status:500});
  return Response.json({messages:data??[],viewerId:userId},{headers:{'cache-control':'no-store'}});
}

export async function POST(request:Request){
  const userId=await getAuthenticatedUserId();
  if(!userId)return Response.json({error:'unauthorized'},{status:401});
  const payload=sendSchema.safeParse(await request.json().catch(()=>null));
  if(!payload.success)return Response.json({error:'invalid_payload'},{status:400});
  const moderation=preModerateText(payload.data.text);
  if(moderation.action==='block')return Response.json({error:'message_blocked'},{status:422});
  const s=await createClient();
  const{data,error}=await s.rpc('submit_message',{
    p_conversation:payload.data.conversationId,
    p_client_message_id:payload.data.clientMessageId,
    p_text:payload.data.text,
    p_provider_action:moderation.action,
    p_labels:moderation.labels,
  });
  if(error){
    const map:[string,number][]=[['not_authenticated',401],['conversation_unavailable',403],['message_rate_limited',429],['message_blocked',422],['invalid_message',400]];
    const hit=map.find(([key])=>error.message.includes(key));
    return Response.json({error:hit?.[0]??'message_failed'},{status:hit?.[1]??400});
  }
  return Response.json({message:data,moderation:moderation.action},{status:201});
}
