import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {isPhoneAuthProductionReady} from '@/lib/auth/provider-readiness';

const phoneSchema=z.string().trim().transform(value=>value.replace(/[\s().-]/g,'')).refine(value=>/^\+[1-9]\d{7,14}$/.test(value));
const schema=z.object({phone:phoneSchema,token:z.string().trim().regex(/^\d{4,8}$/)});

export async function POST(request:Request){
  if(!isPhoneAuthProductionReady())return Response.json({error:'phone_binding_unavailable'},{status:503});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'invalid_payload'},{status:400});
  const s=await createClient();
  const{data:{user:before}}=await s.auth.getUser();
  if(!before)return Response.json({error:'unauthorized'},{status:401});
  const{data,error}=await s.auth.verifyOtp({phone:parsed.data.phone,token:parsed.data.token,type:'phone_change'});
  if(error||!data.user||data.user.id!==before.id)return Response.json({error:'invalid_or_expired_code'},{status:400});
  return Response.json({ok:true,phone:parsed.data.phone});
}
