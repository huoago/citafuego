'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items=[
  {href:'/descubrir',label:'Descubrir',icon:'⌁'},
  {href:'/comunidad',label:'Comunidad',icon:'◎'},
  {href:'/azar',label:'Azar',icon:'✦'},
  {href:'/likes',label:'Likes',icon:'♡'},
  {href:'/matches',label:'Matches',icon:'🔥'},
  {href:'/chats',label:'Chat',icon:'◌'},
  {href:'/citas',label:'Citas',icon:'⌖'},
];

export function AppTopNav(){
  const pathname=usePathname();
  return <nav className="datingTopNav" aria-label="Funciones principales de CitaFuego">
    <div className="datingTopNavTrack">
      {items.map(item=>{
        const active=pathname===item.href||pathname.startsWith(`${item.href}/`);
        return <Link key={item.href} href={item.href} className={active?'active':''} aria-current={active?'page':undefined}>
          <span aria-hidden="true">{item.icon}</span><b>{item.label}</b>
        </Link>;
      })}
    </div>
  </nav>;
}
