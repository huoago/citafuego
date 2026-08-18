import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const phoneSchema=z.string().trim().transform(value=>value.replace(/[\s().-]/g,'')).refine(value=>/^\+[1-9]\d{7,14}$/.test(value));
const schema=z.object({phone:phoneSchema,token:z.string().trim().regex(/^\d{4,8}$/),mode:z.enum(['register','login'])});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'invalid_payload'},{status:400});
  const s=await createClient();
  const{data,error}=await s.auth.verifyOtp({phone:parsed.data.phone,token:parsed.data.token,type:'sms'});
  if(error||!data.user)return Response.json({error:'expired_code'},{status:400});
  const{data:privateRow}=await s.from('user_private').select('user_id').eq('user_id',data.user.id).maybeSingle();
  if(!privateRow)return Response.json({ok:true,next:'/registro/completar'});
  const{data:profile}=await s.from('profiles').select('status').eq('id',data.user.id).maybeSingle();
  return Response.json({ok:true,next:profile?.status==='active'?'/descubrir':'/onboarding'});
}
