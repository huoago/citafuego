'use client';
import Link from 'next/link';
import { useState } from 'react';

type Notification={id:string;kind:string;title:string;body:string;href:string|null;read_at:string|null;created_at:string};
export function NotificationsList({initial}:{initial:Notification[]}){const[items,setItems]=useState(initial);const[busy,setBusy]=useState(false);async function mark(id?:string){setBusy(true);const r=await fetch('/api/notifications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(id?{id}:{all:true})});setBusy(false);if(r.ok){const now=new Date().toISOString();setItems(current=>current.map(x=>!id||x.id===id?{...x,read_at:x.read_at??now}:x))}}
 if(!items.length)return <div className="emptyState"><h2>Todo tranquilo</h2><p>Aquí aparecerán Likes, Matches, mensajes, Boost y conexiones aleatorias.</p></div>;
 return <div className="notificationsStack"><div className="notificationToolbar"><span>{items.filter(x=>!x.read_at).length} sin leer</span><button type="button" className="ghostButton" disabled={busy||items.every(x=>x.read_at)} onClick={()=>void mark()}>Marcar todo leído</button></div>{items.map(item=>{const content=<><span className={`notificationDot ${item.read_at?'read':''}`}/><div><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</small></div></>;return item.href?<Link key={item.id} href={item.href} className={`notificationCard ${item.read_at?'read':''}`} onClick={()=>{if(!item.read_at)void mark(item.id)}}>{content}<span>›</span></Link>:<button type="button" key={item.id} className={`notificationCard ${item.read_at?'read':''}`} onClick={()=>void mark(item.id)}>{content}</button>})}</div>;
}
