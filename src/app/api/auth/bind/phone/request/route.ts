import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {isPhoneAuthProductionReady} from '@/lib/auth/provider-readiness';

const phoneSchema=z.string().trim().transform(value=>value.replace(/[\s().-]/g,'')).refine(value=>/^\+[1-9]\d{7,14}$/.test(value));
const schema=z.object({phone:phoneSchema});

export async function POST(request:Request){
  if(!isPhoneAuthProductionReady())return Response.json({error:'phone_binding_unavailable'},{status:503});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'invalid_phone'},{status:400});
  const s=await createClient();
  const{data:{user}}=await s.auth.getUser();
  if(!user)return Response.json({error:'unauthorized'},{status:401});
  const{error}=await s.auth.updateUser({phone:parsed.data.phone});
  if(error){
    if(error.status===429)return Response.json({error:'rate_limited'},{status:429});
    return Response.json({error:'phone_binding_failed'},{status:400});
  }
  return Response.json({ok:true,phone:parsed.data.phone,message:'Te enviamos un código por SMS.'});
}
