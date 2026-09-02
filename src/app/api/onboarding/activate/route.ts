import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';

export async function POST(){
  if(!await getAuthenticatedUserId())return Response.json({error:'unauthorized'},{status:401});
  const supabase=await createClient();
  const{data,error}=await supabase.rpc('refresh_profile_activation');
  if(error)return Response.json({error:'activation_failed'},{status:400});

  let referral:{claimed:boolean;featuredUntil?:string|null}|null=null;
  const jar=await cookies();
  const code=jar.get('cf_ref')?.value?.trim().toUpperCase();
  if(code&&/^[A-Z0-9]{10}$/.test(code)){
    const{data:reward,error:rewardError}=await supabase.rpc('claim_referral_reward',{p_code:code});
    if(!rewardError&&reward){
      const result=reward as {featuredUntil?:string|null};
      referral={claimed:true,featuredUntil:result.featuredUntil??null};
      jar.delete('cf_ref');
    }
  }
  return Response.json({activation:data,referral});
}
