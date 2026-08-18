import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic='force-dynamic';

type ChatRow={conversation_id:string;display_name:string;verified:boolean;primary_photo_path:string|null;matched_at:string;last_message_at:string|null;last_message_preview:string|null};
type UnreadRow={conversation_id:string;unread_count:number|string};

function friendlyTime(value:string){
  const date=new Date(value);const now=new Date();const diff=Math.max(0,now.getTime()-date.getTime());
  const minutes=Math.floor(diff/60000);const hours=Math.floor(diff/3600000);const days=Math.floor(diff/86400000);
  if(minutes<1)return 'Ahora';
  if(minutes<60)return `${minutes} min`;
  if(hours<24)return `${hours} h`;
  if(days<2)return 'Ayer';
  if(days<7)return new Intl.DateTimeFormat('es-PE',{weekday:'short',timeZone:'America/Lima'}).format(date).replace('.','');
  return new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',timeZone:'America/Lima'}).format(date).replace('.','');
}

export default async function Page(){
  const s=await createClient();
  const[{data},{data:unreadData}]=await Promise.all([
    s.rpc('get_my_matches',{p_limit:50}),
    s.rpc('get_my_chat_unread_counts'),
  ]);
  const rows=(data??[]) as ChatRow[];
  const unreadMap=new Map(((unreadData??[]) as UnreadRow[]).map(row=>[row.conversation_id,Number(row.unread_count??0)]));
  const paths=rows.map(row=>row.primary_photo_path).filter((path):path is string=>Boolean(path));
  const urls=new Map<string,string>();
  if(paths.length){const{data:signed}=await s.storage.from('profile-photos').createSignedUrls(paths,600);signed?.forEach(item=>{if(item.path&&item.signedUrl)urls.set(item.path,item.signedUrl)})}

  return <section className="chatInboxPage">
    <div className="iosLargeHeader"><div><p className="eyebrow">Tus conexiones</p><h1>Chat</h1><p className="muted">Tus conversaciones con Matches, ordenadas por actividad reciente.</p></div></div>
    {rows.length?<div className="listCard iosChatList">{rows.map(row=>{
      const imageUrl=row.primary_photo_path?urls.get(row.primary_photo_path)??null:null;
      const isNewMatch=!row.last_message_at;
      const unreadCount=Math.max(0,unreadMap.get(row.conversation_id)??0);
      return <Link className={`chatRow${isNewMatch?' newMatch':''}${unreadCount>0?' unread':''}`} href={`/chats/${row.conversation_id}`} key={row.conversation_id} aria-label={unreadCount>0?`${row.display_name}, ${unreadCount} mensajes sin leer`:undefined}>
        {imageUrl?<span className="chatPhoto"><Image src={imageUrl} alt={row.display_name} fill sizes="56px"/></span>:<span className="avatarPlaceholder small">{row.display_name.slice(0,1)}</span>}
        <span className="chatCopy"><strong>{row.display_name} {row.verified?'✓':''}</strong><span>{row.last_message_preview??'🔥 Hicieron Match. ¿Quieres romper el hielo?'}</span></span>
        <span className="chatMeta">{unreadCount>0?<span className="chatUnreadCount" aria-hidden="true">{unreadCount>99?'99+':unreadCount}</span>:null}{row.last_message_at?<time dateTime={row.last_message_at}>{friendlyTime(row.last_message_at)}</time>:<small>Nuevo Match</small>}<b aria-hidden="true">›</b></span>
      </Link>})}</div>:<div className="emptyState"><p className="eyebrow">Tu primer chat empieza con un Match</p><h2>Aún no tienes conversaciones</h2><p>Descubre personas, encuentra afinidad y cuando el Like sea mutuo podrán hablar aquí.</p><Link href="/descubrir" className="ctaButton">Descubrir personas</Link></div>}
  </section>;
}
