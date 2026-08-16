import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from './public-config';

export function createServiceClient(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!key)throw new Error('SUPABASE_SERVICE_ROLE_KEY_NOT_CONFIGURED');
 return createClient(getSupabaseUrl(),key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{'x-citafuego-service':'commercialization-v2'}}});
}
