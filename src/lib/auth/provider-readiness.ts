type SupabaseAuthSettings={
  external?:Record<string,unknown>;
  sms_provider?:unknown;
};

export type AuthProviderReadiness={
  checked:boolean;
  google:boolean;
  phone:boolean;
};

const fallback:AuthProviderReadiness={checked:false,google:false,phone:false};

export async function getAuthProviderReadiness():Promise<AuthProviderReadiness>{
  const baseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/,'');
  const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
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
    const phone=Boolean(smsProvider&&smsProvider!=='none'&&smsProvider!=='noop');
    return{checked:true,google,phone};
  }catch{
    return fallback;
  }
}
