'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect,useState } from 'react';

type IconName='discover'|'community'|'matches'|'chat'|'profile';

const items = [
  { href: '/descubrir', icon: 'discover' as IconName, label: 'Descubrir' },
  { href: '/comunidad', icon: 'community' as IconName, label: 'Comunidad' },
  { href: '/matches', icon: 'matches' as IconName, label: 'Matches' },
  { href: '/chats', icon: 'chat' as IconName, label: 'Chat' },
  { href: '/perfil', icon: 'profile' as IconName, label: 'Perfil' },
] as const;

function TabIcon({name}:{name:IconName}){
  if(name==='discover') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z"/></svg>;
  if(name==='community') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM15.9 10.5a2.6 2.6 0 1 0 0-5.2"/><path d="M3.5 19.2c.5-3.4 2.2-5.3 5-5.3s4.6 1.9 5.1 5.3M14 14.4c3.4-.7 5.7 1 6.3 4.8"/></svg>;
  if(name==='matches') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8.9c0 5-8 10.1-8 10.1S4 13.9 4 8.9C4 6.2 5.9 4.5 8.2 4.5c1.5 0 2.9.8 3.8 2.1.9-1.3 2.3-2.1 3.8-2.1C18.1 4.5 20 6.2 20 8.9Z"/></svg>;
  if(name==='chat') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14v10H9l-4 3v-13Z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19c.7-3.4 2.9-5.2 6.5-5.2s5.8 1.8 6.5 5.2"/></svg>;
}

export function BottomNav({initialUnreadChats=0}:{initialUnreadChats?:number}) {
  const pathname = usePathname();
  const[unreadChats,setUnreadChats]=useState(()=>Math.max(0,initialUnreadChats));

  useEffect(()=>{
    let active=true;
    async function refreshUnread(){
      const response=await fetch('/api/chat-read',{cache:'no-store'}).catch(()=>null);
      if(!active||!response?.ok)return;
      const data=await response.json().catch(()=>null) as {unreadCount?:number}|null;
      const count=Number(data?.unreadCount);
      if(active&&Number.isFinite(count))setUnreadChats(Math.max(0,count));
    }
    function onUnreadChanged(event:Event){
      const count=Number((event as CustomEvent<number>).detail);
      if(Number.isFinite(count))setUnreadChats(Math.max(0,count));
      else void refreshUnread();
    }
    function onVisibility(){if(document.visibilityState==='visible')void refreshUnread()}
    window.addEventListener('citafuego:chat-unread',onUnreadChanged);
    window.addEventListener('focus',refreshUnread);
    document.addEventListener('visibilitychange',onVisibility);
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refreshUnread()},15000);
    return()=>{
      active=false;
      window.clearInterval(timer);
      window.removeEventListener('citafuego:chat-unread',onUnreadChanged);
      window.removeEventListener('focus',refreshUnread);
      document.removeEventListener('visibilitychange',onVisibility);
    };
  },[]);

  return (
    <nav className="bottomNav iosTabBar" aria-label="Navegación principal">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const chatWithUnread=item.icon==='chat'&&unreadChats>0;
        return (
          <Link
            key={item.href}
            className={`navItem${active ? ' active' : ''}`}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            aria-label={chatWithUnread?`Chat, ${unreadChats} mensajes sin leer`:undefined}
          >
            <span className="navIcon"><TabIcon name={item.icon}/>{chatWithUnread?<span className="navUnreadBadge" aria-hidden="true">{unreadChats>99?'99+':unreadChats}</span>:null}</span>
            <span className="navLabel">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
