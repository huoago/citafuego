'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppIcon, type AppIconName } from '@/components/ui/app-icon';

const items:{href:string;icon:AppIconName;label:string}[] = [
  { href: '/descubrir', icon: 'sparkles', label: 'Descubrir' },
  { href: '/matches', icon: 'heart', label: 'Matches' },
  { href: '/likes', icon: 'search', label: 'Likes' },
  { href: '/chats', icon: 'chat', label: 'Chats' },
  { href: '/perfil', icon: 'person', label: 'Perfil' },
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
            <span className="navIcon"><AppIcon name={item.icon} size={22}/></span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
