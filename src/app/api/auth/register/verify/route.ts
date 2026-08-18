import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {isEmailRegistrationProductionReady} from '@/lib/auth/provider-readiness';

const schema=z.object({
  email:z.string().trim().email().max(254),
  code:z.string().trim().regex(/^\d{6}$/),
});

export async function POST(request:Request){
  if(!isEmailRegistrationProductionReady())return Response.json({error:'email_registration_unavailable'},{status:503});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'invalid_code'},{status:400});
  const s=await createClient();
  const{error}=await s.auth.verifyOtp({
    email:parsed.data.email.toLowerCase(),
    token:parsed.data.code,
    type:'email',
  });
  if(error){
    if(error.status===429)return Response.json({error:'verification_rate_limited'},{status:429});
    return Response.json({error:'invalid_or_expired_code'},{status:400});
  }
  const{data:{user}}=await s.auth.getUser();
  if(!user)return Response.json({error:'verification_failed'},{status:401});
  return Response.json({ok:true,next:'/onboarding'});
}
