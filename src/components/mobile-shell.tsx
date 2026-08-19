import type { ReactNode } from 'react';
import Link from 'next/link';
import { BottomNav } from './bottom-nav';
import { PresenceHeartbeat } from './presence-heartbeat';
import { AppTopNav } from './app-top-nav';
import { UiPreferencesBootstrap } from './ui-preferences-bootstrap';

function BellIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9.5a5.5 5.5 0 0 1 11 0v4l1.8 2.4H4.7l1.8-2.4v-4Z"/><path d="M10 18.3a2.2 2.2 0 0 0 4 0"/></svg>}
function PlusIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>}
function GearIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7a6.3 6.3 0 0 0-.7-1.7l.9-1.9-2.1-2.1-1.9.9a6.3 6.3 0 0 0-1.7-.7L10.5 2h-3l-.7 2.3a6.3 6.3 0 0 0-1.7.7l-1.9-.9-2.1 2.1.9 1.9a6.3 6.3 0 0 0-.7 1.7L0 10.5v3l2.3.7c.2.6.4 1.1.7 1.7l-.9 1.9 2.1 2.1 1.9-.9c.5.3 1.1.6 1.7.7l.7 2.3h3l.7-2.3c.6-.2 1.1-.4 1.7-.7l1.9.9 2.1-2.1-.9-1.9c.3-.5.6-1.1.7-1.7l2.3-.7Z"/></svg>}

export function MobileShell({children,unreadNotifications=0,unreadChats=0}:{children:ReactNode;unreadNotifications?:number;unreadChats?:number}){
  return <div className="appCanvas"><div className="mobileShell iosAppShell">
    <PresenceHeartbeat/>
    <UiPreferencesBootstrap/>
    <header className="appHeader iosAppHeader">
      <Link href="/descubrir" className="brandMini" aria-label="CitaFuego Descubrir"><span className="brandMark">🔥</span><span>CitaFuego</span></Link>
      <div className="appHeaderActions">
        <Link className="headerIconButton" href="/ajustes" aria-label="Configuración"><GearIcon/></Link>
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
    <AppTopNav/>
    <main className="appMain">{children}</main>
    <BottomNav initialUnreadChats={unreadChats}/>
  </div></div>;
}
