import {headers} from 'next/headers';
import {getSupabasePublishableKey,getSupabaseUrl} from '@/lib/supabase/public-config';

type SupabaseAuthSettings={
  external?:Record<string,unknown>;
  sms_provider?:unknown;
};

type AccountEdgeReadiness={ready?:boolean};

export type AuthProviderReadiness={
  checked:boolean;
  account:boolean;
  emailRegistration:boolean;
  google:boolean;
  phone:boolean;
};

const fallback:AuthProviderReadiness={checked:false,account:false,emailRegistration:false,google:false,phone:false};

export function isEmailRegistrationProductionReady(){
  return process.env.EMAIL_AUTH_PRODUCTION_READY==='true'&&process.env.EMAIL_AUTH_DELIVERY_MODE==='otp_code';
}

export function isPhoneAuthProductionReady(){
  return process.env.PHONE_AUTH_PRODUCTION_READY==='true';
}

async function getRequestOidcToken(){
  try{
    const requestHeaders=await headers();
    return requestHeaders.get('x-vercel-oidc-token')?.trim()||process.env.VERCEL_OIDC_TOKEN?.trim()||'';
  }catch{
    return process.env.VERCEL_OIDC_TOKEN?.trim()||'';
  }
}

async function getAccountEdgeReadiness(baseUrl:string,publishableKey:string){
  const oidcToken=await getRequestOidcToken();
  if(!oidcToken)return false;
  try{
    const response=await fetch(`${baseUrl}/functions/v1/account-auth-v12`,{
      method:'POST',
      headers:{
        'content-type':'application/json',
        apikey:publishableKey,
        authorization:`Bearer ${oidcToken}`,
        'x-citafuego-account-edge':'v12',
      },
      body:JSON.stringify({action:'health'}),
      cache:'no-store',
      redirect:'error',
    });
    if(!response.ok)return false;
    const body=await response.json() as AccountEdgeReadiness;
    return body.ready===true;
  }catch{return false}
}

export async function getAuthProviderReadiness():Promise<AuthProviderReadiness>{
  const baseUrl=getSupabaseUrl().trim().replace(/\/$/,'');
  const publishableKey=getSupabasePublishableKey().trim();
  if(!baseUrl||!publishableKey)return fallback;
  try{
    const[settingsResponse,account]=await Promise.all([
      fetch(`${baseUrl}/auth/v1/settings`,{headers:{apikey:publishableKey},next:{revalidate:60}}),
      getAccountEdgeReadiness(baseUrl,publishableKey),
    ]);
    if(!settingsResponse.ok)return{...fallback,account};
    const settings=await settingsResponse.json() as SupabaseAuthSettings;
    const google=settings.external?.google===true;
    const smsProvider=typeof settings.sms_provider==='string'?settings.sms_provider.trim().toLowerCase():'';
    const phone=isPhoneAuthProductionReady()&&Boolean(smsProvider&&smsProvider!=='none'&&smsProvider!=='noop');
    return{checked:true,account,emailRegistration:isEmailRegistrationProductionReady(),google,phone};
  }catch{return fallback}
}
