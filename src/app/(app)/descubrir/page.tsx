import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { serializeDiscover } from '@/lib/discovery/serialize';
import { DiscoverDeck } from '@/components/discover-deck';
export const dynamic='force-dynamic';
export default async function Page(){
 const s=await createClient();
 const{data,error}=await s.rpc('get_discover_page_v3',{p_offset:0,p_limit:12});
 if(error)return <div className="emptyState"><h1>Descubrir está disponible</h1><p>No pudimos cargar recomendaciones en este momento. Puedes completar tus preferencias para obtener mejores resultados, pero no necesitas activar un perfil para entrar.</p><Link className="ghostButton" href="/onboarding?edit=1">Ajustar preferencias</Link></div>;
 const profiles=await serializeDiscover(s,(data??[]) as any[]);
 if(!profiles.length)return <div className="emptyState"><h1>Explora a tu ritmo</h1><p>Aún no encontramos personas compatibles con tus preferencias actuales. Puedes ampliarlas cuando quieras.</p><Link className="ghostButton" href="/onboarding?edit=1">Ajustar preferencias</Link></div>;
 return <DiscoverDeck initialProfiles={profiles} initialHasMore={(data??[]).length===12}/>;
}
