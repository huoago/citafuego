import Link from 'next/link';
import { publicFeatures } from '@/lib/public-features';
import styles from './public-feature.module.css';

export function PublicFeatureNav() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="CitaFuego inicio">
        <span className={styles.brandMark}>🔥</span><span>CitaFuego</span>
      </Link>
      <div className={styles.navViewport} aria-label="Funciones de CitaFuego">
        <nav className={styles.nav}>
          {publicFeatures.map((feature) => (
            <Link key={feature.slug} href={feature.slug}>{feature.label}</Link>
          ))}
        </nav>
      </div>
      <div className={styles.actions}>
        <Link className={styles.login} href="/iniciar-sesion">Entrar</Link>
        <Link className={styles.join} href="/registro">Crear perfil</Link>
      </div>
    </header>
  );
}
