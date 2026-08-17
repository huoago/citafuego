import Link from 'next/link';
import type { PublicFeature } from '@/lib/public-features';
import { publicFeatures } from '@/lib/public-features';
import { PublicFeatureNav } from './PublicFeatureNav';
import styles from './public-feature.module.css';

export function PublicFeaturePage({ feature }: { feature: PublicFeature }) {
  const index = publicFeatures.findIndex((item) => item.slug === feature.slug);
  const previous = publicFeatures[(index - 1 + publicFeatures.length) % publicFeatures.length];
  const next = publicFeatures[(index + 1) % publicFeatures.length];

  return (
    <div className={styles.shell}>
      <PublicFeatureNav />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>{feature.eyebrow}</p>
            <h1>{feature.title}</h1>
            <p className={styles.summary}>{feature.summary}</p>
            <p className={styles.detail}>{feature.detail}</p>
            <div className={styles.buttons}>
              <Link className={styles.primary} href="/registro">🔥 Crear mi perfil</Link>
              {feature.productHref ? <Link className={styles.secondary} href={feature.productHref}>{feature.productLabel ?? 'Abrir producto'}</Link> : <Link className={styles.secondary} href="/como-funciona">Cómo funciona</Link>}
            </div>
          </div>
          <aside className={styles.panel} aria-label={`Puntos clave de ${feature.label}`}>
            <div className={styles.icon}>{feature.icon}</div>
            <h2>{feature.label}</h2>
            <ul className={styles.bullets}>
              {feature.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          </aside>
        </section>
        <nav className={styles.pager} aria-label="Otras funciones">
          <Link href={previous.slug}>← {previous.label}</Link>
          <Link href="/">Todas las funciones</Link>
          <Link href={next.slug}>{next.label} →</Link>
        </nav>
      </main>
      <footer className={styles.footer}>
        <span>© CitaFuego · Plataforma social y de citas para adultos 18+</span>
        <div className={styles.footerLinks}>
          <Link href="/safety">Seguridad</Link><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/help">Ayuda</Link>
        </div>
      </footer>
    </div>
  );
}
