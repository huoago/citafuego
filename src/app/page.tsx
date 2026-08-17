import Link from 'next/link';
import { PublicFeatureNav } from '@/components/public/PublicFeatureNav';
import { publicFeatures } from '@/lib/public-features';
import styles from './home.module.css';

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <PublicFeatureNav />

      <div className={styles.stage}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Dating + social privado para adultos en Latinoamérica</p>
            <h1>Conoce personas.<br />Siente la química.<br /><span>Conserva el control.</span></h1>
            <p className={styles.lead}>CitaFuego reúne Swipe, verificación, chat sincronizado para Matches, Random, contenido social, álbum privado y recomendaciones en una sola experiencia.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/registro">🔥 Crear mi perfil</Link>
              <Link className={styles.secondary} href="/swipe">Ver cómo funciona</Link>
            </div>
            <div className={styles.trustRow}>
              <span>18+</span><span>Ubicación aproximada</span><span>Chat sincronizado</span><span>Controles de privacidad</span>
            </div>
          </div>

          <div className={styles.demoArea} aria-label="Demostración del producto con datos de ejemplo">
            <div className={styles.cardBack} />
            <article className={styles.profileCard}>
              <div className={styles.demoLabel}>Demo · datos de ejemplo</div>
              <div className={styles.photo} />
              <div className={styles.shade} />
              <div className={styles.profileCopy}>
                <div className={styles.name}><strong>Lucía, 27</strong><b>✓</b></div>
                <p>Miraflores · 1–3 km</p>
                <div className={styles.tags}><span>☕ Café</span><span>✈ Viajes</span><span>♫ Música</span></div>
                <div className={styles.compatibility}>🔥 91% compatibilidad</div>
              </div>
            </article>
            <div className={styles.swipeButtons} aria-hidden="true"><span>×</span><span>↶</span><span>♥</span></div>
          </div>
        </section>

        <section className={styles.featureDock} aria-label="Todas las funciones">
          <div className={styles.dockTitle}>
            <strong>Explora cada función</strong>
            <span>Desliza horizontalmente y abre su página independiente →</span>
          </div>
          <div className={styles.featureRail}>
            {publicFeatures.map((feature) => (
              <Link className={styles.featureCard} href={feature.slug} key={feature.slug}>
                <span className={styles.featureIcon}>{feature.icon}</span>
                <div><strong>{feature.label}</strong><small>{feature.eyebrow}</small></div>
                <b>→</b>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <span>© CitaFuego · 18+</span>
        <div><Link href="/safety">Seguridad</Link><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/help">Ayuda</Link></div>
      </footer>
    </main>
  );
}
