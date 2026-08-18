import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isAdultBirthDate, parseIsoDate } from '@/lib/auth/age';

const schema=z.object({birthDate:z.string(),acceptTerms:z.literal(true),acceptPrivacy:z.literal(true),acceptSensitive:z.literal(true)});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||!parseIsoDate(parsed.data.birthDate))return Response.json({error:'invalid_payload'},{status:400});
  if(!isAdultBirthDate(parsed.data.birthDate))return Response.json({error:'adult_only'},{status:422});
  const s=await createClient();
  const{data:{user}}=await s.auth.getUser();
  if(!user)return Response.json({error:'unauthorized'},{status:401});
  const{error}=await s.rpc('complete_pending_registration',{
    p_birth_date:parsed.data.birthDate,
    p_accept_terms:true,
    p_accept_privacy:true,
    p_accept_sensitive:true,
  });
  if(error){
    if(error.message.includes('adult_only'))return Response.json({error:'adult_only'},{status:422});
    return Response.json({error:'completion_failed'},{status:400});
  }
  return Response.json({ok:true,next:'/onboarding'});
}
