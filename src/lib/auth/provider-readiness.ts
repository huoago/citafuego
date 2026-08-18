import {getSupabasePublishableKey,getSupabaseUrl} from '@/lib/supabase/public-config';

type SupabaseAuthSettings={
  external?:Record<string,unknown>;
  sms_provider?:unknown;
};

export type AuthProviderReadiness={
  checked:boolean;
  emailRegistration:boolean;
  google:boolean;
  phone:boolean;
};

const fallback:AuthProviderReadiness={checked:false,emailRegistration:false,google:false,phone:false};

export function isEmailRegistrationProductionReady(){
  return process.env.EMAIL_AUTH_PRODUCTION_READY==='true'&&process.env.EMAIL_AUTH_DELIVERY_MODE==='otp_code';
}

export function isPhoneAuthProductionReady(){
  return process.env.PHONE_AUTH_PRODUCTION_READY==='true';
}

export async function getAuthProviderReadiness():Promise<AuthProviderReadiness>{
  const baseUrl=getSupabaseUrl().trim().replace(/\/$/,'');
  const publishableKey=getSupabasePublishableKey().trim();
  if(!baseUrl||!publishableKey)return fallback;
  try{
    const response=await fetch(`${baseUrl}/auth/v1/settings`,{
      headers:{apikey:publishableKey},
      next:{revalidate:60},
    });
    if(!response.ok)return fallback;
    const settings=await response.json() as SupabaseAuthSettings;
    const google=settings.external?.google===true;
    const smsProvider=typeof settings.sms_provider==='string'?settings.sms_provider.trim().toLowerCase():'';
    const phone=isPhoneAuthProductionReady()&&Boolean(smsProvider&&smsProvider!=='none'&&smsProvider!=='noop');
    return{checked:true,emailRegistration:isEmailRegistrationProductionReady(),google,phone};
  }catch{
    return fallback;
  }
}
