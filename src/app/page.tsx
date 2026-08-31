import Link from 'next/link';
import { PublicFeatureNav } from '@/components/public/PublicFeatureNav';
import { publicFeatures } from '@/lib/public-features';
import styles from './home.module.css';

const essentialSlugs=new Set(['/swipe','/verificacion','/chat-privado','/seguridad-privacidad']);
const essentialFeatures=publicFeatures.filter((feature)=>essentialSlugs.has(feature.slug));

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <PublicFeatureNav />

      <div className={styles.stage}>
        <section className={`${styles.hero} v15HomeHero`}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Conexiones reales para adultos en Lima</p>
            <h1>Conoce personas reales cerca de ti.<br /><span>Conecta con más confianza.</span></h1>
            <p className={styles.lead}>Haz Match, conversa y decide hasta dónde quieres compartir. CitaFuego combina perfiles con más contexto, ubicación aproximada y controles de privacidad para que tú mantengas el control.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/registro">🔥 Crear mi perfil</Link>
              <Link className={styles.secondary} href="/como-funciona">Cómo funciona</Link>
            </div>
            <div className={styles.trustRow}>
              <span>Solo 18+</span><span>Ubicación aproximada</span><span>Perfiles con señales de confianza</span><span>Privacidad bajo tu control</span>
            </div>
          </div>

          <div className={styles.demoArea} aria-label="Vista previa de la experiencia local de CitaFuego">
            <div className={styles.cardBack} />
            <article className={styles.profileCard}>
              <div className={styles.demoLabel}>Vista previa</div>
              <div className={styles.photo} aria-hidden="true" />
              <div className={styles.shade} />
              <div className={styles.profileCopy}>
                <div className={styles.name}><strong>Descubre Lima</strong><b>✓</b></div>
                <p>Distritos y distancias aproximadas</p>
                <div className={styles.tags}><span>Perfiles reales</span><span>Privacidad</span><span>18+</span></div>
                <div className={styles.compatibility}>Sin perfiles ni actividad inventada</div>
              </div>
            </article>
            <div className={styles.swipeButtons} aria-hidden="true"><span>×</span><span>↶</span><span>♥</span></div>
          </div>
        </section>

        <section className={styles.featureDock} aria-label="Funciones esenciales">
          <div className={styles.dockTitle}>
            <strong>Lo esencial para conectar</strong>
            <span>4 funciones clave · descubre el resto en Cómo funciona</span>
          </div>
          <div className={styles.featureRail}>
            {essentialFeatures.map((feature) => (
              <Link className={styles.featureCard} href={feature.slug} key={feature.slug}>
                <span className={styles.featureIcon}>{feature.icon}</span>
                <div><strong>{feature.label}</strong><small>{feature.summary}</small></div>
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
