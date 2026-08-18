import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthRequestOrigin } from '@/lib/auth/request-origin';

const schema=z.object({email:z.string().trim().email().max(254)});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'invalid_payload'},{status:400});
  const supabase=await createClient();
  const appUrl=getAuthRequestOrigin(request);
  await supabase.auth.signInWithOtp({
    email:parsed.data.email.toLowerCase(),
    options:{shouldCreateUser:false,emailRedirectTo:`${appUrl}/auth/confirm?flow=login`},
  });
  return Response.json({ok:true,message:'Si existe una cuenta, recibirás un enlace de acceso.'});
}
