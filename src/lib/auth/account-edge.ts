import 'server-only';
import {createHash} from 'node:crypto';
import {getSupabasePublishableKey,getSupabaseUrl} from '@/lib/supabase/public-config';

type AccountAction='register'|'login';
type AccountEdgeResponse={
  ok?:boolean;
  error?:string;
  accessToken?:string;
  refreshToken?:string;
  expiresIn?:number;
};

export function accountClientFingerprint(request:Request){
  const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip=forwarded||request.headers.get('x-real-ip')?.trim()||request.headers.get('cf-connecting-ip')?.trim()||'unknown';
  const userAgent=(request.headers.get('user-agent')??'unknown').slice(0,180);
  return createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');
}

export async function callAccountEdge(request:Request,action:AccountAction,username:string,password:string){
  const oidcToken=process.env.VERCEL_OIDC_TOKEN?.trim()??'';
  if(!oidcToken)return{status:503,data:{error:'account_backend_unavailable'} as AccountEdgeResponse};
  const baseUrl=getSupabaseUrl().trim().replace(/\/$/,'');
  const publishableKey=getSupabasePublishableKey().trim();
  if(!baseUrl||!publishableKey)return{status:503,data:{error:'account_backend_unavailable'} as AccountEdgeResponse};
  try{
    const response=await fetch(`${baseUrl}/functions/v1/account-auth-v12`,{
      method:'POST',
      headers:{
        'content-type':'application/json',
        apikey:publishableKey,
        authorization:`Bearer ${oidcToken}`,
        'x-citafuego-account-edge':'v12',
        'x-citafuego-client-fingerprint':accountClientFingerprint(request),
      },
      body:JSON.stringify({action,username,password}),
      cache:'no-store',
    });
    const data=await response.json().catch(()=>({error:'account_backend_unavailable'})) as AccountEdgeResponse;
    return{status:response.status,data};
  }catch{
    return{status:503,data:{error:'account_backend_unavailable'} as AccountEdgeResponse};
  }
}
