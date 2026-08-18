import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {createServiceClient} from '@/lib/supabase/service';
import {createInternalAccountEmail,isAllowedAccountUsername,normalizeAccountUsername} from '@/lib/auth/account-identity';
import {verifyTurnstile} from '@/lib/security/turnstile';

const schema=z.object({
  username:z.string().trim().min(4).max(24),
  password:z.string().min(10).max(72).regex(/[A-Za-z]/).regex(/\d/),
  turnstileToken:z.string().max(2048).optional(),
});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||!isAllowedAccountUsername(parsed.data.username))return Response.json({error:'invalid_payload'},{status:400});
  const challenge=await verifyTurnstile(request,parsed.data.turnstileToken,'register');
  if(!challenge.ok)return Response.json({error:challenge.error??'challenge_failed'},{status:403});

  const service=createServiceClient();
  const normalized=normalizeAccountUsername(parsed.data.username);
  const{data:existing,error:lookupError}=await service.from('account_usernames').select('user_id').eq('normalized_username',normalized).maybeSingle();
  if(lookupError)return Response.json({error:'registration_unavailable'},{status:503});
  if(existing)return Response.json({error:'account_taken'},{status:409});

  const loginEmail=createInternalAccountEmail();
  const{data:created,error:createError}=await service.auth.admin.createUser({
    email:loginEmail,
    password:parsed.data.password,
    email_confirm:true,
    user_metadata:{registration_kind:'username_password'},
  });
  if(createError||!created.user)return Response.json({error:'registration_unavailable'},{status:503});

  const{error:mappingError}=await service.from('account_usernames').insert({
    user_id:created.user.id,
    username:parsed.data.username.trim(),
    normalized_username:normalized,
  });
  if(mappingError){
    await service.auth.admin.deleteUser(created.user.id).catch(()=>undefined);
    return Response.json({error:mappingError.code==='23505'?'account_taken':'registration_unavailable'},{status:mappingError.code==='23505'?409:503});
  }

  const supabase=await createClient();
  const{error:signInError}=await supabase.auth.signInWithPassword({email:loginEmail,password:parsed.data.password});
  if(signInError){
    await service.auth.admin.deleteUser(created.user.id).catch(()=>undefined);
    return Response.json({error:'registration_unavailable'},{status:503});
  }
  return Response.json({ok:true,next:'/registro/completar'});
}
