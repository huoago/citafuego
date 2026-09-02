import {createClient} from 'npm:@supabase/supabase-js@2';
import {createRemoteJWKSet,decodeJwt,jwtVerify} from 'npm:jose@6';

type Action='health'|'register'|'login'|'change_password'|'reset_password'|'set_recovery_email'|'request_recovery';
type Payload={action?:Action;username?:string;password?:string;currentPassword?:string;newPassword?:string;email?:string};

const jsonHeaders={'content-type':'application/json','cache-control':'no-store'};
const reserved=new Set(['admin','administrator','soporte','support','citafuego','moderador','moderator','seguridad','security','root','staff']);
const teamSlug='huoago-7712s-projects';
const projectName='citafuego-prod';
const expectedAudience=`https://vercel.com/${teamSlug}`;
const expectedSubject=`owner:${teamSlug}:project:${projectName}:environment:production`;
const allowedIssuers=new Set([`https://oidc.vercel.com/${teamSlug}`,'https://oidc.vercel.com']);
const resetRedirect='https://citafuego.com/auth/confirm?next=/restablecer-contrasena';
const passwordMinLength=6;
const passwordMaxLength=72;

function response(body:Record<string,unknown>,status=200){return new Response(JSON.stringify(body),{status,headers:jsonHeaders})}
function normalize(value:string){return value.trim().toLowerCase()}
function validUsername(value:string){const v=normalize(value);return /^[a-z0-9][a-z0-9._-]{3,23}$/.test(v)&&!reserved.has(v)}
function validPassword(value:string){return value.length>=passwordMinLength&&value.length<=passwordMaxLength}
function validEmail(value:string){const v=value.trim().toLowerCase();return v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&!v.endsWith('@accounts.citafuego.invalid')}

function parseNamedKey(name:string,legacyName:string){
  try{const parsed=JSON.parse(Deno.env.get(name)??'{}');if(typeof parsed.default==='string'&&parsed.default)return parsed.default as string}catch{}
  return Deno.env.get(legacyName)??'';
}

async function verifyVercelIdentity(req:Request){
  const authHeader=req.headers.get('authorization')??'';
  const token=authHeader.startsWith('Bearer ')?authHeader.slice(7).trim():'';
  if(!token)return false;
  let issuer='';try{issuer=String(decodeJwt(token).iss??'')}catch{return false}
  if(!allowedIssuers.has(issuer))return false;
  try{const jwks=createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks`));await jwtVerify(token,jwks,{issuer,audience:expectedAudience,subject:expectedSubject});return true}catch{return false}
}

async function digest(value:string){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('')}
async function sha1Hex(value:string){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest('SHA-1',bytes);return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('').toUpperCase()}

async function passwordExposure(password:string):Promise<'safe'|'pwned'|'unavailable'>{
  const hash=await sha1Hex(password);const prefix=hash.slice(0,5);const suffix=hash.slice(5);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6000);
  try{
    const r=await fetch(`https://api.pwnedpasswords.com/range/${prefix}`,{headers:{'user-agent':'CitaFuego-Password-Security/1.0','Add-Padding':'true'},signal:controller.signal,cache:'no-store'});
    if(!r.ok)return'unavailable';
    const body=await r.text();
    for(const line of body.split(/\r?\n/)){const [candidate,countRaw]=line.trim().split(':');if(candidate===suffix&&Number(countRaw)>0)return'pwned'}
    return'safe';
  }catch{return'unavailable'}finally{clearTimeout(timer)}
}

async function enforceSafePassword(password:string){
  if(!validPassword(password))return{ok:false,status:400,error:'invalid_password'} as const;
  const exposure=await passwordExposure(password);
  if(exposure==='pwned')return{ok:false,status:400,error:'compromised_password'} as const;
  if(exposure==='unavailable')return{ok:false,status:503,error:'password_security_unavailable'} as const;
  return{ok:true,status:200,error:''} as const;
}

Deno.serve(async(req)=>{
  const url=Deno.env.get('SUPABASE_URL')??'';
  const secretKey=parseNamedKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
  const publishableKey=parseNamedKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
  if(req.method!=='POST'||req.headers.get('x-citafuego-account-edge')!=='v12')return response({error:'not_found'},404);
  if(!(await verifyVercelIdentity(req)))return response({error:'unauthorized_backend'},401);
  if(!url||!secretKey||!publishableKey)return response({error:'service_unavailable'},503);
  let payload:Payload={};try{payload=await req.json()}catch{return response({error:'invalid_payload'},400)}
  if(payload.action==='health')return response({ready:true,version:'v12.4',passwordMinLength,passwordMaxLength,recovery:true,compromisedPasswordCheck:'hibp_k_anonymity'});

  const trustedFingerprint=req.headers.get('x-citafuego-client-fingerprint')??'';
  if(!/^[a-f0-9]{64}$/.test(trustedFingerprint))return response({error:'invalid_fingerprint'},400);
  const admin=createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth=createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const action=payload.action;

  if(action==='change_password'||action==='reset_password'||action==='set_recovery_email'){
    const userJwt=req.headers.get('x-citafuego-user-jwt')?.trim()??'';
    if(!userJwt)return response({error:'not_authenticated'},401);
    const{data:userData,error:userError}=await auth.auth.getUser(userJwt);
    const user=userData.user;if(userError||!user)return response({error:'not_authenticated'},401);
    if(action==='change_password'){
      const currentPassword=String(payload.currentPassword??'');const nextPassword=String(payload.newPassword??'');
      if(currentPassword.length<1||currentPassword.length>passwordMaxLength||currentPassword===nextPassword)return response({error:'invalid_password'},400);
      const safe=await enforceSafePassword(nextPassword);if(!safe.ok)return response({error:safe.error},safe.status);
      const{data:authUser,error:lookupError}=await admin.auth.admin.getUserById(user.id);const email=authUser.user?.email;
      if(lookupError||!email)return response({error:'service_unavailable'},503);
      const{error:verifyError}=await auth.auth.signInWithPassword({email,password:currentPassword});if(verifyError)return response({error:'current_password_incorrect'},401);
      const{error:updateError}=await admin.auth.admin.updateUserById(user.id,{password:nextPassword});if(updateError)return response({error:'password_update_failed'},503);
      return response({ok:true});
    }
    if(action==='reset_password'){
      const nextPassword=String(payload.newPassword??'');const safe=await enforceSafePassword(nextPassword);if(!safe.ok)return response({error:safe.error},safe.status);
      const{error:updateError}=await admin.auth.admin.updateUserById(user.id,{password:nextPassword});if(updateError)return response({error:'password_update_failed'},503);
      return response({ok:true});
    }
    const email=String(payload.email??'').trim().toLowerCase();if(!validEmail(email))return response({error:'invalid_email'},400);
    const{error:updateError}=await admin.auth.admin.updateUserById(user.id,{email,email_confirm:true});if(updateError)return response({error:'email_update_failed'},503);
    return response({ok:true,email});
  }

  const username=typeof payload.username==='string'?payload.username:'';
  const normalized=normalize(username);
  if(action==='request_recovery'){
    if(!validUsername(username))return response({ok:true});
    const recoveryFingerprint=await digest(`${trustedFingerprint}|${normalized}`);
    const[{data:ipAllowed},{data:accountAllowed}]=await Promise.all([
      admin.rpc('consume_account_auth_rate_limit',{p_action:'recovery_ip',p_fingerprint:trustedFingerprint,p_limit:5,p_window_seconds:3600}),
      admin.rpc('consume_account_auth_rate_limit',{p_action:'recovery_account',p_fingerprint:recoveryFingerprint,p_limit:3,p_window_seconds:3600}),
    ]);
    if(ipAllowed!==true||accountAllowed!==true)return response({ok:true});
    const{data:account}=await admin.from('account_usernames').select('user_id').eq('normalized_username',normalized).maybeSingle();
    if(account?.user_id){const{data:authUser}=await admin.auth.admin.getUserById(String(account.user_id));const email=authUser.user?.email??'';if(email&&!email.endsWith('@accounts.citafuego.invalid'))await auth.auth.resetPasswordForEmail(email,{redirectTo:resetRedirect}).catch(()=>undefined)}
    return response({ok:true});
  }

  const password=typeof payload.password==='string'?payload.password:'';
  if((action!=='register'&&action!=='login')||!validUsername(username)||password.length<1||password.length>passwordMaxLength)return response({error:action==='login'?'invalid_credentials':'invalid_payload'},action==='login'?401:400);

  if(action==='register'){
    const safe=await enforceSafePassword(password);if(!safe.ok)return response({error:safe.error},safe.status);
    const{data:allowed,error:rateError}=await admin.rpc('consume_account_auth_rate_limit',{p_action:'register_ip',p_fingerprint:trustedFingerprint,p_limit:5,p_window_seconds:3600});
    if(rateError)return response({error:'service_unavailable'},503);if(allowed!==true)return response({error:'rate_limited'},429);
    const{data:existing,error:lookupError}=await admin.from('account_usernames').select('user_id').eq('normalized_username',normalized).maybeSingle();
    if(lookupError)return response({error:'service_unavailable'},503);if(existing)return response({error:'account_taken'},409);
    const internalEmail=`${crypto.randomUUID()}@accounts.citafuego.invalid`;
    const{data:created,error:createError}=await admin.auth.admin.createUser({email:internalEmail,password,email_confirm:true,user_metadata:{registration_kind:'username_password'}});
    if(createError||!created.user)return response({error:'registration_unavailable'},503);
    const{error:mappingError}=await admin.from('account_usernames').insert({user_id:created.user.id,username:username.trim(),normalized_username:normalized});
    if(mappingError){await admin.auth.admin.deleteUser(created.user.id).catch(()=>undefined);return response({error:mappingError.code==='23505'?'account_taken':'registration_unavailable'},mappingError.code==='23505'?409:503)}
    const{data:sessionData,error:sessionError}=await auth.auth.signInWithPassword({email:internalEmail,password});
    if(sessionError||!sessionData.session){await admin.from('account_usernames').delete().eq('user_id',created.user.id).catch(()=>undefined);await admin.auth.admin.deleteUser(created.user.id).catch(()=>undefined);return response({error:'session_failed'},503)}
    return response({ok:true,accessToken:sessionData.session.access_token,refreshToken:sessionData.session.refresh_token,expiresIn:sessionData.session.expires_in});
  }

  const accountFingerprint=await digest(`${trustedFingerprint}|${normalized}`);
  const[{data:ipAllowed,error:ipRateError},{data:accountAllowed,error:accountRateError}]=await Promise.all([
    admin.rpc('consume_account_auth_rate_limit',{p_action:'login_ip',p_fingerprint:trustedFingerprint,p_limit:30,p_window_seconds:600}),
    admin.rpc('consume_account_auth_rate_limit',{p_action:'login_account',p_fingerprint:accountFingerprint,p_limit:10,p_window_seconds:600}),
  ]);
  if(ipRateError||accountRateError)return response({error:'service_unavailable'},503);if(ipAllowed!==true||accountAllowed!==true)return response({error:'rate_limited'},429);
  const{data:account}=await admin.from('account_usernames').select('user_id').eq('normalized_username',normalized).maybeSingle();if(!account?.user_id)return response({error:'invalid_credentials'},401);
  const{data:authUser,error:authLookupError}=await admin.auth.admin.getUserById(String(account.user_id));const currentEmail=authUser.user?.email;if(authLookupError||!currentEmail)return response({error:'invalid_credentials'},401);
  const{data:sessionData,error:sessionError}=await auth.auth.signInWithPassword({email:currentEmail,password});if(sessionError||!sessionData.session)return response({error:'invalid_credentials'},401);
  return response({ok:true,accessToken:sessionData.session.access_token,refreshToken:sessionData.session.refresh_token,expiresIn:sessionData.session.expires_in});
});
