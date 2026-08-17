import type { ReactNode } from 'react';
import Link from 'next/link';
import { BottomNav } from './bottom-nav';
import { PresenceHeartbeat } from './presence-heartbeat';
import { AppIcon } from '@/components/ui/app-icon';

export function MobileShell({children,unreadNotifications=0}:{children:ReactNode;unreadNotifications?:number}){
 return <div className="appCanvas"><div className="mobileShell"><PresenceHeartbeat/>
  <header className="appHeader">
   <Link href="/descubrir" className="brandMini" aria-label="CitaFuego inicio"><span className="brandMark">🔥</span><span>CitaFuego</span></Link>
   <div className="appHeaderActions">
    <Link className="headerIconButton forYouNavBadge" href="/para-ti" aria-label="Para ti"><AppIcon name="sparkles" size={17}/><span>Para ti</span></Link>
    <Link className="headerIconButton" href="/azar" aria-label="Conexión aleatoria"><AppIcon name="bolt"/></Link>
    <Link className="headerIconButton notificationButton" href="/notificaciones" aria-label={`${unreadNotifications} notificaciones sin leer`}><AppIcon name="bell"/>{unreadNotifications>0?<b>{Math.min(unreadNotifications,99)}</b>:null}</Link>
    <details className="headerMore">
     <summary aria-label="Más secciones"><AppIcon name="plus"/></summary>
     <div className="headerMoreMenu">
      <Link href="/stories"><AppIcon name="stories" size={19}/>Stories</Link>
      <Link href="/blog"><AppIcon name="blog" size={19}/>Blog</Link>
      <Link href="/albumes"><AppIcon name="album" size={19}/>Álbumes privados</Link>
      <Link href="/citas"><AppIcon name="calendar" size={19}/>Date Safety</Link>
      <Link href="/guardados"><AppIcon name="bookmark" size={19}/>Guardados</Link>
      <Link href="/tienda"><AppIcon name="bag" size={19}/>Tienda</Link>
      <Link href="/boost"><AppIcon name="bolt" size={19}/>Boost</Link>
      <Link href="/premium"><AppIcon name="crown" size={19}/>Premium</Link>
      <Link href="/seguridad"><AppIcon name="shield" size={19}/>Seguridad</Link>
     </div>
    </details>
   </div>
  </header>
  <main className="appMain">{children}</main><BottomNav/>
 </div></div>
}
