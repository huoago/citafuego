import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {callAccountEdgePayload} from '@/lib/auth/account-edge';

const schema=z.object({email:z.string().trim().email().max(254)});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'invalid_email'},{status:400});
  const s=await createClient();
  const[{data:{user}},{data:{session}}]=await Promise.all([s.auth.getUser(),s.auth.getSession()]);
  if(!user||!session?.access_token)return Response.json({error:'not_authenticated'},{status:401});
  const edge=await callAccountEdgePayload(request,{action:'set_recovery_email',email:parsed.data.email},session.access_token);
  if(edge.status!==200||!edge.data.ok)return Response.json({error:edge.data.error??'email_update_failed'},{status:edge.status===400?400:503});
  return Response.json({ok:true,email:edge.data.email??parsed.data.email});
}
