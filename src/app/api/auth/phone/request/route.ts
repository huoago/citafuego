import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthProviderReadiness } from '@/lib/auth/provider-readiness';

const phoneSchema=z.string().trim().transform(value=>value.replace(/[\s().-]/g,'')).refine(value=>/^\+[1-9]\d{7,14}$/.test(value));
const schema=z.object({phone:phoneSchema,mode:z.enum(['register','login'])});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'invalid_phone'},{status:400});
  const readiness=await getAuthProviderReadiness();
  if(!readiness.phone)return Response.json({error:'phone_provider_unavailable'},{status:503});
  const s=await createClient();
  const{error}=await s.auth.signInWithOtp({phone:parsed.data.phone,options:{shouldCreateUser:parsed.data.mode==='register'}});
  if(error){
    const unavailable=/provider|sms|phone|twilio|messagebird|vonage|disabled|not enabled/i.test(error.message);
    if(unavailable)return Response.json({error:'phone_provider_unavailable'},{status:503});
    if(parsed.data.mode==='login')return Response.json({ok:true});
    return Response.json({error:'phone_request_failed'},{status:error.status===429?429:400});
  }
  return Response.json({ok:true});
}
