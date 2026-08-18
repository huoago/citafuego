import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from './public-config';

export function getSupabaseServerSecret(){
 const modern=process.env.SUPABASE_SECRET_KEY?.trim();
 const legacy=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 return modern||legacy||'';
}

export function createServiceClient(){
 const key=getSupabaseServerSecret();
 if(!key)throw new Error('SUPABASE_SERVER_SECRET_NOT_CONFIGURED');
 return createClient(getSupabaseUrl(),key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{'x-citafuego-service':'server'}}});
}
