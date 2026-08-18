import {createClient} from 'npm:@supabase/supabase-js@2';

type Action='register'|'login';
type Payload={action?:Action;username?:string;password?:string};

const jsonHeaders={'content-type':'application/json','cache-control':'no-store'};
const reserved=new Set(['admin','administrator','soporte','support','citafuego','moderador','moderator','seguridad','security','root','staff']);

function response(body:Record<string,unknown>,status=200){return new Response(JSON.stringify(body),{status,headers:jsonHeaders})}
function normalize(value:string){return value.trim().toLowerCase()}
function validUsername(value:string){const v=normalize(value);return /^[a-z0-9][a-z0-9._-]{3,23}$/.test(v)&&!reserved.has(v)}
function validRegisterPassword(value:string){return value.length>=10&&value.length<=72&&/[A-Za-z]/.test(value)&&/\d/.test(value)}

function parseNamedKey(name:string,legacyName:string){
  try{
    const parsed=JSON.parse(Deno.env.get(name)??'{}');
    if(typeof parsed.default==='string'&&parsed.default)return parsed.default as string;
  }catch{}
  return Deno.env.get(legacyName)??'';
}

async function digest(value:string){
  const bytes=new TextEncoder().encode(value);
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
}

function requestFingerprint(req:Request){
  const forwarded=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip=forwarded||req.headers.get('cf-connecting-ip')?.trim()||'unknown';
  const agent=(req.headers.get('user-agent')??'unknown').slice(0,180);
  return `${ip}|${agent}`;
}

Deno.serve(async(req)=>{
  const url=Deno.env.get('SUPABASE_URL')??'';
  const secretKey=parseNamedKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
  const publishableKey=parseNamedKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');

  if(req.method==='GET'){
    return response({ready:Boolean(url&&secretKey&&publishableKey),version:'v12.1'});
  }
  if(req.method!=='POST'||req.headers.get('x-citafuego-account-edge')!=='v12')return response({error:'not_found'},404);
  if(!url||!secretKey||!publishableKey)return response({error:'service_unavailable'},503);

  let payload:Payload={};
  try{payload=await req.json()}catch{return response({error:'invalid_payload'},400)}
  const username=typeof payload.username==='string'?payload.username:'';
  const password=typeof payload.password==='string'?payload.password:'';
  const action=payload.action;
  if((action!=='register'&&action!=='login')||!validUsername(username)||password.length<1||password.length>72)return response({error:action==='login'?'invalid_credentials':'invalid_payload'},action==='login'?401:400);
  if(action==='register'&&!validRegisterPassword(password))return response({error:'invalid_payload'},400);

  const admin=createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth=createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const normalized=normalize(username);
  const baseFingerprint=await digest(requestFingerprint(req));

  if(action==='register'){
    const{data:allowed,error:rateError}=await admin.rpc('consume_account_auth_rate_limit',{p_action:'register_ip',p_fingerprint:baseFingerprint,p_limit:5,p_window_seconds:3600});
    if(rateError)return response({error:'service_unavailable'},503);
    if(allowed!==true)return response({error:'rate_limited'},429);

    const{data:existing,error:lookupError}=await admin.from('account_usernames').select('user_id').eq('normalized_username',normalized).maybeSingle();
    if(lookupError)return response({error:'service_unavailable'},503);
    if(existing)return response({error:'account_taken'},409);

    const internalEmail=`${crypto.randomUUID()}@accounts.citafuego.invalid`;
    const{data:created,error:createError}=await admin.auth.admin.createUser({email:internalEmail,password,email_confirm:true,user_metadata:{registration_kind:'username_password'}});
    if(createError||!created.user)return response({error:'registration_unavailable'},503);

    const{error:mappingError}=await admin.from('account_usernames').insert({user_id:created.user.id,username:username.trim(),normalized_username:normalized});
    if(mappingError){
      await admin.auth.admin.deleteUser(created.user.id).catch(()=>undefined);
      return response({error:mappingError.code==='23505'?'account_taken':'registration_unavailable'},mappingError.code==='23505'?409:503);
    }

    const{data:sessionData,error:sessionError}=await auth.auth.signInWithPassword({email:internalEmail,password});
    if(sessionError||!sessionData.session)return response({error:'session_failed'},503);
    return response({ok:true,accessToken:sessionData.session.access_token,refreshToken:sessionData.session.refresh_token,expiresIn:sessionData.session.expires_in});
  }

  const accountFingerprint=await digest(`${baseFingerprint}|${normalized}`);
  const[{data:ipAllowed,error:ipRateError},{data:accountAllowed,error:accountRateError}]=await Promise.all([
    admin.rpc('consume_account_auth_rate_limit',{p_action:'login_ip',p_fingerprint:baseFingerprint,p_limit:30,p_window_seconds:600}),
    admin.rpc('consume_account_auth_rate_limit',{p_action:'login_account',p_fingerprint:accountFingerprint,p_limit:10,p_window_seconds:600}),
  ]);
  if(ipRateError||accountRateError)return response({error:'service_unavailable'},503);
  if(ipAllowed!==true||accountAllowed!==true)return response({error:'rate_limited'},429);

  const{data:account}=await admin.from('account_usernames').select('user_id').eq('normalized_username',normalized).maybeSingle();
  if(!account?.user_id)return response({error:'invalid_credentials'},401);
  const{data:authUser,error:authLookupError}=await admin.auth.admin.getUserById(String(account.user_id));
  const currentEmail=authUser.user?.email;
  if(authLookupError||!currentEmail)return response({error:'invalid_credentials'},401);

  const{data:sessionData,error:sessionError}=await auth.auth.signInWithPassword({email:currentEmail,password});
  if(sessionError||!sessionData.session)return response({error:'invalid_credentials'},401);
  return response({ok:true,accessToken:sessionData.session.access_token,refreshToken:sessionData.session.refresh_token,expiresIn:sessionData.session.expires_in});
});
