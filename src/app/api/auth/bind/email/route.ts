import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {isEmailRegistrationProductionReady} from '@/lib/auth/provider-readiness';

const schema=z.object({email:z.string().trim().email().max(254)});

export async function POST(request:Request){
  if(!isEmailRegistrationProductionReady())return Response.json({error:'email_binding_unavailable'},{status:503});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'invalid_email'},{status:400});
  const s=await createClient();
  const{data:{user}}=await s.auth.getUser();
  if(!user)return Response.json({error:'unauthorized'},{status:401});
  const{error}=await s.auth.updateUser({email:parsed.data.email.toLowerCase()});
  if(error){
    if(error.status===429)return Response.json({error:'rate_limited'},{status:429});
    return Response.json({error:'email_binding_failed'},{status:400});
  }
  return Response.json({ok:true,message:'Revisa tu correo y confirma la dirección para terminar la vinculación.'});
}
