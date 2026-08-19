import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {callAccountEdgePayload} from '@/lib/auth/account-edge';

const schema=z.object({newPassword:z.string().min(10).max(72)});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'invalid_password'},{status:400});
  const s=await createClient();
  const[{data:{user}},{data:{session}}]=await Promise.all([s.auth.getUser(),s.auth.getSession()]);
  if(!user||!session?.access_token)return Response.json({error:'not_authenticated'},{status:401});
  const edge=await callAccountEdgePayload(request,{action:'reset_password',newPassword:parsed.data.newPassword},session.access_token);
  if(edge.status!==200||!edge.data.ok){
    const code=edge.data.error??'password_update_failed';
    const status=edge.status===400?400:edge.status===401?401:503;
    return Response.json({error:code},{status});
  }
  return Response.json({ok:true});
}
