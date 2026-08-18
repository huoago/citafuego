import type { ReactNode } from 'react';
import Link from 'next/link';
import { BottomNav } from './bottom-nav';
import { PresenceHeartbeat } from './presence-heartbeat';

function BellIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0v4l1.8 2.4H4.7l1.8-2.4v-4Z"/><path d="M10 18.3a2.2 2.2 0 0 0 4 0"/></svg>}
function PlusIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>}

export function MobileShell({children,unreadNotifications=0}:{children:ReactNode;unreadNotifications?:number}){
  return <div className="appCanvas"><div className="mobileShell iosAppShell">
    <PresenceHeartbeat/>
    <header className="appHeader iosAppHeader">
      <Link href="/descubrir" className="brandMini" aria-label="CitaFuego Descubrir"><span className="brandMark">🔥</span><span>CitaFuego</span></Link>
      <div className="appHeaderActions">
        <Link className="headerIconButton notificationButton" href="/notificaciones" aria-label={`${unreadNotifications} notificaciones sin leer`}><BellIcon/>{unreadNotifications>0?<b>{Math.min(unreadNotifications,99)}</b>:null}</Link>
        <details className="headerMore">
          <summary aria-label="Crear contenido"><PlusIcon/></summary>
          <div className="headerMoreMenu iosSheetMenu">
            <Link href="/blog/nuevo">Crear publicación</Link>
            <Link href="/stories/nuevo">Nueva Story</Link>
          </div>
        </details>
      </div>
    </header>
    <main className="appMain">{children}</main>
    <BottomNav/>
  </div></div>;
}
