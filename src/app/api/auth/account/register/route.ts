import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {callAccountEdge} from '@/lib/auth/account-edge';
import {isAllowedAccountUsername} from '@/lib/auth/account-identity';
import {verifyTurnstile} from '@/lib/security/turnstile';

const schema=z.object({
  username:z.string().trim().min(4).max(24),
  password:z.string().min(10).max(72),
  turnstileToken:z.string().max(2048).optional(),
});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||!isAllowedAccountUsername(parsed.data.username))return Response.json({error:'invalid_payload'},{status:400});
  const challenge=await verifyTurnstile(request,parsed.data.turnstileToken,'register');
  if(!challenge.ok)return Response.json({error:challenge.error??'challenge_failed'},{status:403});

  const edge=await callAccountEdge(request,'register',parsed.data.username,parsed.data.password);
  if(edge.status!==200||!edge.data.ok||!edge.data.accessToken||!edge.data.refreshToken){
    const error=edge.data.error??'registration_unavailable';
    const status=edge.status===409?409:edge.status===429?429:edge.status===400?400:503;
    return Response.json({error},{status});
  }

  const supabase=await createClient();
  const{error:sessionError}=await supabase.auth.setSession({access_token:edge.data.accessToken,refresh_token:edge.data.refreshToken});
  if(sessionError)return Response.json({error:'session_failed'},{status:503});
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return Response.json({error:'session_failed'},{status:503});
  return Response.json({ok:true,next:'/registro/completar'});
}
