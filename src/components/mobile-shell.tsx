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
          <Link className="safetyButton" href="/seguridad" aria-label="Centro de seguridad">✓</Link>
        </header>
        <main className="appMain">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
