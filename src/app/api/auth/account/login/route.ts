import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {callAccountEdge} from '@/lib/auth/account-edge';
import {isAllowedAccountUsername} from '@/lib/auth/account-identity';
import {verifyTurnstile} from '@/lib/security/turnstile';

const schema=z.object({
  username:z.string().trim().min(4).max(24),
  password:z.string().min(1).max(72),
  turnstileToken:z.string().max(2048).optional(),
});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||!isAllowedAccountUsername(parsed.data.username))return Response.json({error:'invalid_credentials'},{status:401});
  const challenge=await verifyTurnstile(request,parsed.data.turnstileToken,'login');
  if(!challenge.ok)return Response.json({error:challenge.error??'challenge_failed'},{status:403});

  const edge=await callAccountEdge(request,'login',parsed.data.username,parsed.data.password);
  if(edge.status!==200||!edge.data.ok||!edge.data.accessToken||!edge.data.refreshToken){
    if(edge.status===429)return Response.json({error:'rate_limited'},{status:429});
    if(edge.status===401)return Response.json({error:'invalid_credentials'},{status:401});
    return Response.json({error:'login_unavailable'},{status:503});
  }

  const supabase=await createClient();
  const{error:sessionError}=await supabase.auth.setSession({access_token:edge.data.accessToken,refresh_token:edge.data.refreshToken});
  if(sessionError)return Response.json({error:'session_failed'},{status:503});
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return Response.json({error:'session_failed'},{status:503});
  const[{data:privateRow},{data:profile}]=await Promise.all([
    supabase.from('user_private').select('user_id').eq('user_id',user.id).maybeSingle(),
    supabase.from('profiles').select('status').eq('id',user.id).maybeSingle(),
  ]);
  const next=!privateRow?'/registro/completar':profile?.status==='active'?'/descubrir':'/onboarding';
  return Response.json({ok:true,next});
}
