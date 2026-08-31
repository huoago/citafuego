import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';

export const launchFeatureKeys=[
  'REGISTRATION_ENABLED','DISCOVERY_ENABLED','CHAT_ENABLED','REFERRAL_ENABLED','BOOST_ENABLED',
  'MEMBERSHIP_ENABLED','PAYMENTS_ENABLED','ADS_ENABLED','PAID_BOOST_ENABLED','VIDEO_ENABLED','NEW_CITY_ENABLED',
] as const;

export type LaunchFeatureKey=(typeof launchFeatureKeys)[number];

export async function getFeatureFlags(keys:readonly string[]){
  try{
    const db=createServiceClient();
    const{data,error}=await db.from('feature_flags').select('key,enabled,config,updated_at').in('key',[...keys]);
    if(error)return new Map<string,{enabled:boolean;config:Record<string,unknown>;updatedAt:string|null}>();
    return new Map((data??[]).map(row=>[String(row.key),{enabled:Boolean(row.enabled),config:(row.config??{}) as Record<string,unknown>,updatedAt:row.updated_at?String(row.updated_at):null}]));
  }catch{return new Map<string,{enabled:boolean;config:Record<string,unknown>;updatedAt:string|null}>()}
}

export async function areFeaturesEnabled(...keys:LaunchFeatureKey[]){
  const flags=await getFeatureFlags(keys);
  return keys.every(key=>flags.get(key)?.enabled===true);
}
