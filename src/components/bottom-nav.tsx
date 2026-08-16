'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/descubrir', icon: '✦', label: 'Descubrir' },
  { href: '/matches', icon: '♡', label: 'Matches' },
  { href: '/likes', icon: '♥', label: 'Likes' },
  { href: '/chats', icon: '◌', label: 'Chats' },
  { href: '/perfil', icon: '◎', label: 'Perfil' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottomNav" aria-label="Navegación principal">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            className={`navItem${active ? ' active' : ''}`}
            href={item.href}
            aria-current={active ? 'page' : undefined}
          >
            <span className="navIcon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
