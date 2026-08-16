import { createClient } from '@/lib/supabase/server';
import { serializeDiscover } from '@/lib/discovery/serialize';
export async function GET(request:Request){
 const u=new URL(request.url);const offset=Math.max(0,Number(u.searchParams.get('offset')??0)||0);const s=await createClient();
 const{data,error}=await s.rpc('get_discover_page_v3',{p_offset:offset,p_limit:12});
 if(error)return Response.json({error:error.message},{status:403});
 const profiles=await serializeDiscover(s,(data??[]) as any[]);
 return Response.json({profiles,hasMore:(data??[]).length===12});
}
