import type { ReactNode } from 'react';
import Link from 'next/link';
import { BottomNav } from './bottom-nav';
import { PresenceHeartbeat } from './presence-heartbeat';

export function MobileShell({children,unreadNotifications=0}:{children:ReactNode;unreadNotifications?:number}){
 return <div className="appCanvas"><div className="mobileShell"><PresenceHeartbeat/><header className="appHeader"><Link href="/descubrir" className="brandMini" aria-label="CitaFuego inicio"><span className="brandMark">🔥</span><span>CitaFuego</span></Link><div className="appHeaderActions"><Link className="headerIconButton" href="/azar" aria-label="Conexión aleatoria">⚡ <span>Azar</span></Link><Link className="headerIconButton notificationButton" href="/notificaciones" aria-label={`${unreadNotifications} notificaciones sin leer`}>♢{unreadNotifications>0?<b>{Math.min(unreadNotifications,99)}</b>:null}</Link><Link className="headerIconButton" href="/premium" aria-label="Planes premium">✦ <span>Premium</span></Link><Link className="headerIconButton" href="/seguridad" aria-label="Centro de seguridad">✓</Link></div></header><main className="appMain">{children}</main><BottomNav/></div></div>;
}
