import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {callAccountEdgePayload} from '@/lib/auth/account-edge';

const schema=z.object({
  currentPassword:z.string().min(1).max(72),
  newPassword:z.string().min(10).max(72),
});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||parsed.data.currentPassword===parsed.data.newPassword)return Response.json({error:'invalid_password'},{status:400});
  const s=await createClient();
  const[{data:{user}},{data:{session}}]=await Promise.all([s.auth.getUser(),s.auth.getSession()]);
  if(!user||!session?.access_token)return Response.json({error:'not_authenticated'},{status:401});
  const edge=await callAccountEdgePayload(request,{action:'change_password',currentPassword:parsed.data.currentPassword,newPassword:parsed.data.newPassword},session.access_token);
  const code=edge.data.error??'password_update_failed';
  if(edge.status!==200||!edge.data.ok)return Response.json({error:code},{status:edge.status===401?401:edge.status===400?400:503});
  return Response.json({ok:true});
}
