import type { ReactNode } from 'react';
import Link from 'next/link';
import { BottomNav } from './bottom-nav';
import { PresenceHeartbeat } from './presence-heartbeat';

export function MobileShell({children,unreadNotifications=0}:{children:ReactNode;unreadNotifications?:number}){
  return <div className="appCanvas"><div className="mobileShell">
    <PresenceHeartbeat/>
    <header className="appHeader">
      <Link href="/para-ti" className="brandMini" aria-label="CitaFuego inicio"><span className="brandMark">🔥</span><span>CitaFuego</span></Link>
      <div className="appHeaderActions">
        <Link className="headerIconButton homeAction" href="/stories" aria-label="Abrir Stories"><span>Stories</span><b aria-hidden="true">◉</b></Link>
        <Link className="headerIconButton" href="/azar" aria-label="Conexión aleatoria" title="Random">⚡</Link>
        <Link className="headerIconButton notificationButton" href="/notificaciones" aria-label={`${unreadNotifications} notificaciones sin leer`}>♢{unreadNotifications>0?<b>{Math.min(unreadNotifications,99)}</b>:null}</Link>
        <details className="headerMore">
          <summary aria-label="Más secciones">＋</summary>
          <div className="headerMoreMenu">
            <Link href="/likes">♥ Likes recibidos</Link>
            <Link href="/blog/nuevo">＋ Crear publicación</Link>
            <Link href="/stories/nuevo">◉ Nueva Story</Link>
            <Link href="/blog">▤ Blog y conversaciones</Link>
            <Link href="/guardados">⌑ Guardados</Link>
            <Link href="/albumes">▣ Álbumes privados</Link>
            <Link href="/citas">⌖ Date Safety</Link>
            <Link href="/tienda">◈ Tienda</Link>
            <Link href="/boost">⚡ Boost</Link>
            <Link href="/premium">✦ Premium</Link>
            <Link href="/seguridad">✓ Seguridad</Link>
          </div>
        </details>
      </div>
    </header>
    <main className="appMain">{children}</main>
    <BottomNav/>
  </div></div>;
}
