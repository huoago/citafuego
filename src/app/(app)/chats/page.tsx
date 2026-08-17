import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic='force-dynamic';

type ChatRow={conversation_id:string;display_name:string;verified:boolean;primary_photo_path:string|null;matched_at:string;last_message_at:string|null;last_message_preview:string|null};

export default async function Page(){
  const s=await createClient();
  const{data}=await s.rpc('get_my_matches',{p_limit:50});
  const rows=(data??[]) as ChatRow[];
  const paths=rows.map(row=>row.primary_photo_path).filter((path):path is string=>Boolean(path));
  const urls=new Map<string,string>();
  if(paths.length){const{data:signed}=await s.storage.from('profile-photos').createSignedUrls(paths,600);signed?.forEach(item=>{if(item.path&&item.signedUrl)urls.set(item.path,item.signedUrl)})}

  return <section className="chatInboxPage">
    <div className="iosLargeHeader"><div><p className="eyebrow">Tus conexiones</p><h1>Chat</h1><p className="muted">Conversaciones de tus Matches, sincronizadas para que un mensaje pueda llegar aunque la otra persona esté desconectada.</p></div></div>
    {rows.length?<div className="listCard iosChatList">{rows.map(row=>{
      const imageUrl=row.primary_photo_path?urls.get(row.primary_photo_path)??null:null;
      return <Link className="chatRow" href={`/chats/${row.conversation_id}`} key={row.conversation_id}>
        {imageUrl?<span className="chatPhoto"><Image src={imageUrl} alt={row.display_name} fill sizes="56px"/></span>:<span className="avatarPlaceholder small">{row.display_name.slice(0,1)}</span>}
        <span className="chatCopy"><strong>{row.display_name} {row.verified?'✓':''}</strong><span>{row.last_message_preview??'🔥 Hicieron Match. Rompe el hielo.'}</span></span>
        <span className="chatMeta">{row.last_message_at?<time>{new Date(row.last_message_at).toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit'})}</time>:<small>Nuevo</small>}<b aria-hidden="true">›</b></span>
      </Link>})}</div>:<div className="emptyState"><p className="eyebrow">Tu primer chat empieza con un Match</p><h2>Aún no tienes conversaciones</h2><p>Descubre personas, encuentra afinidad y cuando el Like sea mutuo podrán hablar aquí.</p><Link href="/descubrir" className="ctaButton">Descubrir personas</Link></div>}
  </section>;
}
