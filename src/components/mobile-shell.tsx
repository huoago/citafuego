import type { ReactNode } from 'react';
import Link from 'next/link';
import { BottomNav } from './bottom-nav';
import { PresenceHeartbeat } from './presence-heartbeat';

export function MobileShell({children,unreadNotifications=0}:{children:ReactNode;unreadNotifications?:number}){
  return <div className="appCanvas"><div className="mobileShell iosAppShell">
    <PresenceHeartbeat/>
    <header className="appHeader iosAppHeader">
      <Link href="/descubrir" className="brandMini" aria-label="CitaFuego Descubrir"><span className="brandMark">🔥</span><span>CitaFuego</span></Link>
      <div className="appHeaderActions">
        <Link className="headerIconButton homeAction" href="/stories" aria-label="Abrir Stories"><span>Stories</span><b aria-hidden="true">◉</b></Link>
        <Link className="headerIconButton" href="/azar" aria-label="Conexión aleatoria" title="Conexión aleatoria">⚡</Link>
        <Link className="headerIconButton notificationButton" href="/notificaciones" aria-label={`${unreadNotifications} notificaciones sin leer`}>♢{unreadNotifications>0?<b>{Math.min(unreadNotifications,99)}</b>:null}</Link>
        <details className="headerMore">
          <summary aria-label="Crear o abrir utilidades">＋</summary>
          <div className="headerMoreMenu iosSheetMenu">
            <Link href="/blog/nuevo">＋ Crear publicación</Link>
            <Link href="/stories/nuevo">◉ Nueva Story</Link>
            <Link href="/likes">♥ Likes recibidos</Link>
            <Link href="/guardados">⌑ Guardados</Link>
            <Link href="/albumes">▣ Álbumes privados</Link>
            <Link href="/citas">⌖ Date Safety</Link>
            <Link href="/seguridad">✓ Seguridad</Link>
          </div>
        </details>
      </div>
    </header>
    <main className="appMain">{children}</main>
    <BottomNav/>
  </div></div>;
}
