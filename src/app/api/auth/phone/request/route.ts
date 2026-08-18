import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthProviderReadiness } from '@/lib/auth/provider-readiness';

const schema=z.object({phone:z.string().trim().regex(/^\+[1-9]\d{7,14}$/),mode:z.enum(['register','login'])});

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
    // Avoid account enumeration on login requests.
    if(parsed.data.mode==='login')return Response.json({ok:true});
    return Response.json({error:'phone_request_failed'},{status:400});
  }
  return Response.json({ok:true});
}
