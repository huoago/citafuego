import type { ReactNode } from 'react';
import Link from 'next/link';
import { BottomNav } from './bottom-nav';

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="appCanvas">
      <div className="mobileShell">
        <header className="appHeader">
          <Link href="/descubrir" className="brandMini" aria-label="CitaFuego inicio">
            <span className="brandMark">🔥</span>
            <span>CitaFuego</span>
          </Link>
          <div className="appHeaderActions">
            <Link className="headerIconButton" href="/premium" aria-label="Planes premium">✦ <span>Premium</span></Link>
            <Link className="headerIconButton" href="/seguridad" aria-label="Centro de seguridad">✓</Link>
          </div>
        </header>
        <main className="appMain">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
