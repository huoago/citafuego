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
  const{data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return Response.json({authenticated:false,admin:false},{headers});
  const admin=await isActiveAdminUser(supabase,user.id).catch(()=>false);
  return Response.json({authenticated:true,admin},{headers});
}
