import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
export const dynamic='force-dynamic';

export default async function Page(){
 const s=await createClient();const{data}=await s.rpc('get_my_matches',{p_limit:50});const rows=(data??[]) as any[];const paths=rows.map(r=>r.primary_photo_path).filter(Boolean);const urls=new Map<string,string>();if(paths.length){const{data:d}=await s.storage.from('profile-photos').createSignedUrls(paths,600);d?.forEach(x=>{if(x.path&&x.signedUrl)urls.set(x.path,x.signedUrl)})}
 return <section>
  <div className="pageHeader"><p className="eyebrow">Tus conexiones</p><h1>Matches</h1><p className="muted">Aquí aparecen las conexiones recíprocas. Los Likes recibidos siguen en una vista separada para que cada decisión sea explícita.</p></div>
  <div className="iosSegmented" aria-label="Matches y Likes"><Link className="active" href="/matches">Matches</Link><Link href="/likes">Likes</Link></div>
  <div style={{height:14}} aria-hidden="true"/>
  {rows.length?<div className="matchGrid">{rows.map(r=><article className="matchTile" key={r.match_id}><Link className="matchProfileLink" href={`/perfil/${r.other_profile_id}`}>{urls.get(r.primary_photo_path)?<span className="matchPhoto"><Image src={urls.get(r.primary_photo_path)!} alt={r.display_name} fill sizes="(max-width:640px) 44vw,170px"/></span>:<span className="avatarPlaceholder">{String(r.display_name).slice(0,1)}</span>}<strong>{r.display_name} {r.verified?'✓':''}</strong><span>{r.district??'Lima'}</span></Link><Link className="ghostButton" href={`/chats/${r.conversation_id}`}>Abrir chat</Link></article>)}</div>:<div className="emptyState"><p className="eyebrow">Conexión recíproca</p><h2>Aún no tienes Matches</h2><p>Cuando dos personas se dan Like, la conexión aparece aquí y se habilita el chat privado entre ambas.</p><Link href="/descubrir" className="ctaButton">Descubrir personas</Link></div>}
 </section>;
}
