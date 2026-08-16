import 'server-only';

export type TurnstileResult={ok:boolean;configured:boolean;error?:string};

function requestIp(request:Request){
 const direct=request.headers.get('cf-connecting-ip')?.trim();if(direct)return direct;
 const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();return forwarded||undefined;
}

export async function verifyTurnstile(request:Request,token:string|undefined,expectedAction='register'):Promise<TurnstileResult>{
 const secret=process.env.TURNSTILE_SECRET_KEY?.trim()??'';
 if(!secret)return{ok:true,configured:false};
 if(!token)return{ok:false,configured:true,error:'challenge_required'};
 const form=new FormData();form.set('secret',secret);form.set('response',token);form.set('idempotency_key',crypto.randomUUID());
 const ip=requestIp(request);if(ip)form.set('remoteip',ip);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form,signal:controller.signal,cache:'no-store'});
  if(!response.ok)return{ok:false,configured:true,error:'challenge_unavailable'};
  const result=await response.json() as {success?:boolean;action?:string;hostname?:string};
  if(!result.success)return{ok:false,configured:true,error:'challenge_failed'};
  if(result.action&&result.action!==expectedAction)return{ok:false,configured:true,error:'challenge_action_mismatch'};
  const expectedHost=process.env.TURNSTILE_EXPECTED_HOSTNAME?.trim();
  if(expectedHost&&result.hostname&&result.hostname!==expectedHost)return{ok:false,configured:true,error:'challenge_host_mismatch'};
  return{ok:true,configured:true};
 }catch{return{ok:false,configured:true,error:'challenge_unavailable'};}finally{clearTimeout(timer);}
}
