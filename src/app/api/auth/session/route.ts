import {isActiveAdminUser} from '@/lib/admin/auth';
import {createClient} from '@/lib/supabase/server';

export const dynamic='force-dynamic';

const headers={
  'cache-control':'private, no-store, max-age=0',
  'pragma':'no-cache',
  'vary':'Cookie',
};

export async function GET(){
  const supabase=await createClient();
  const{data,error}=await supabase.auth.getClaims();
  const userId=typeof data?.claims?.sub==='string'?data.claims.sub:'';
  if(error||!userId)return Response.json({authenticated:false,admin:false},{headers});
  const admin=await isActiveAdminUser(supabase,userId).catch(()=>false);
  return Response.json({authenticated:true,admin},{headers});
}
