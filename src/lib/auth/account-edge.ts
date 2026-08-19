import 'server-only';
import {createHash} from 'node:crypto';
import {getSupabasePublishableKey,getSupabaseUrl} from '@/lib/supabase/public-config';

export type AccountAction='register'|'login'|'change_password'|'reset_password'|'set_recovery_email'|'request_recovery';
export type AccountEdgePayload={
  action:AccountAction;
  username?:string;
  password?:string;
  currentPassword?:string;
  newPassword?:string;
  email?:string;
};
export type AccountEdgeResponse={
  ok?:boolean;
  error?:string;
  accessToken?:string;
  refreshToken?:string;
  expiresIn?:number;
  email?:string;
};

export function accountClientFingerprint(request:Request){
  const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip=forwarded||request.headers.get('x-real-ip')?.trim()||request.headers.get('cf-connecting-ip')?.trim()||'unknown';
  const userAgent=(request.headers.get('user-agent')??'unknown').slice(0,180);
  return createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');
}

export function getVercelRequestOidcToken(request:Request){
  return request.headers.get('x-vercel-oidc-token')?.trim()||process.env.VERCEL_OIDC_TOKEN?.trim()||'';
}

export async function callAccountEdgePayload(request:Request,payload:AccountEdgePayload,userJwt=''){
  const oidcToken=getVercelRequestOidcToken(request);
  if(!oidcToken)return{status:503,data:{error:'account_backend_unavailable'} as AccountEdgeResponse};
  const baseUrl=getSupabaseUrl().trim().replace(/\/$/,'');
  const publishableKey=getSupabasePublishableKey().trim();
  if(!baseUrl||!publishableKey)return{status:503,data:{error:'account_backend_unavailable'} as AccountEdgeResponse};
  try{
    const headers:Record<string,string>={
      'content-type':'application/json',
      apikey:publishableKey,
      authorization:`Bearer ${oidcToken}`,
      'x-citafuego-account-edge':'v12',
      'x-citafuego-client-fingerprint':accountClientFingerprint(request),
    };
    if(userJwt)headers['x-citafuego-user-jwt']=userJwt;
    const response=await fetch(`${baseUrl}/functions/v1/account-auth-v12`,{
      method:'POST',headers,body:JSON.stringify(payload),cache:'no-store',redirect:'error',
    });
    const data=await response.json().catch(()=>({error:'account_backend_unavailable'})) as AccountEdgeResponse;
    return{status:response.status,data};
  }catch{
    return{status:503,data:{error:'account_backend_unavailable'} as AccountEdgeResponse};
  }
}

export function callAccountEdge(request:Request,action:'register'|'login',username:string,password:string){
  return callAccountEdgePayload(request,{action,username,password});
}
