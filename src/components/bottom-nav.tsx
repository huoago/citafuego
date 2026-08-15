import Link from 'next/link';

const items = [
  { href: '/descubrir', icon: '🔥', label: 'Descubrir' },
  { href: '/matches', icon: '♡', label: 'Matches' },
  { href: '/likes', icon: '♥', label: 'Likes' },
  { href: '/chats', icon: '💬', label: 'Chats' },
  { href: '/perfil', icon: '◉', label: 'Perfil' },
];

export function BottomNav() {
  return (
    <nav className="bottomNav" aria-label="Navegación principal">
      {items.map((item) => (
        <Link key={item.href} className="navItem" href={item.href}>
          <span className="navIcon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
