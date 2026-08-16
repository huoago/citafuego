import { createClient } from '@/lib/supabase/server';
import { serializeDiscover } from '@/lib/discovery/serialize';
import { DiscoverDeck } from '@/components/discover-deck';
export const dynamic='force-dynamic';
export default async function Page(){
 const s=await createClient();
 const{data,error}=await s.rpc('get_discover_page_v3',{p_offset:0,p_limit:12});
 if(error)return <div className="emptyState"><h1>Completa tu perfil</h1><p>Tu perfil debe estar activo antes de entrar a Descubrir.</p></div>;
 const profiles=await serializeDiscover(s,(data??[]) as any[]);
 return <DiscoverDeck initialProfiles={profiles} initialHasMore={(data??[]).length===12}/>;
}
