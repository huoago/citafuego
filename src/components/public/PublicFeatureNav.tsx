'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { publicFeatures } from '@/lib/public-features';
import styles from './public-feature.module.css';

export function PublicFeatureNav() {
  const pathname=usePathname();
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="CitaFuego inicio">
        <span className={styles.brandMark}>🔥</span><span>CitaFuego</span>
      </Link>
      <div className={styles.navViewport} aria-label="Funciones de CitaFuego">
        <nav className={styles.nav}>
          {publicFeatures.map((feature) => {
            const active=pathname===feature.slug;
            return <Link key={feature.slug} href={feature.slug} className={active?styles.activeNav:undefined} aria-current={active?'page':undefined}>{feature.label}</Link>;
          })}
        </nav>
      </div>
      <div className={styles.actions}>
        <Link className={styles.login} href="/iniciar-sesion">Entrar</Link>
        <Link className={styles.join} href="/registro">Crear perfil</Link>
      </div>
    </header>
  );
}
