import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthRequestOrigin } from '@/lib/auth/request-origin';

const schema=z.object({email:z.string().trim().email().max(254),next:z.literal('/admin').optional()});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'invalid_payload'},{status:400});
  const supabase=await createClient();
  const appUrl=getAuthRequestOrigin(request);
  const callback=new URL('/auth/confirm',appUrl);
  callback.searchParams.set('flow','login');
  if(parsed.data.next==='/admin')callback.searchParams.set('next','/admin');
  await supabase.auth.signInWithOtp({
    email:parsed.data.email.toLowerCase(),
    options:{shouldCreateUser:false,emailRedirectTo:callback.toString()},
  });
  return Response.json({ok:true,message:'Si existe una cuenta, recibirás un enlace de acceso.'});
}
