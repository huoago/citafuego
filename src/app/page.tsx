import Link from 'next/link';
import { PublicFeatureNav } from '@/components/public/PublicFeatureNav';
import { publicFeatures } from '@/lib/public-features';
import styles from './home.module.css';

const socialDNA=[
  {icon:'◎',title:'Relaciones reales',copy:'Perfiles, follows, Matches y señales de confianza forman una identidad social coherente.'},
  {icon:'◉',title:'Momentos visuales',copy:'Stories y Blog priorizan foto, video y contexto antes de iniciar una conversación.'},
  {icon:'✦',title:'Descubrimiento inteligente',copy:'Para ti aprende intereses y combina novedad, diversidad y compatibilidad.'},
  {icon:'↳',title:'Conversaciones profundas',copy:'Comentarios, respuestas y menciones permiten pasar del contenido a una relación social.'},
];

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <PublicFeatureNav />
      <div className={styles.stage}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.livePill}><span/>Social + dating privado para adultos</div>
            <h1>Conoce personas.<br />Descubre afinidad.<br /><span>Decide tú.</span></h1>
            <p className={styles.lead}>CitaFuego combina descubrimiento visual, perfiles sociales, conversaciones, Stories, Blog y recomendaciones con controles de privacidad desde el diseño.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/registro">Crear mi perfil</Link>
              <Link className={styles.secondary} href="/iniciar-sesion">Ya tengo cuenta</Link>
            </div>
            <div className={styles.trustRow}>
              <span>18+</span><span>Ubicación aproximada</span><span>Chat P2P</span><span>Bloqueo inmediato</span>
            </div>
          </div>

          <div className={styles.demoArea} aria-label="Demostración del producto con datos de ejemplo">
            <div className={styles.deviceFrame}>
              <div className={styles.dynamicIsland}/>
              <div className={styles.storyRail} aria-hidden="true"><i/><i/><i/><i/></div>
              <article className={styles.profileCard}>
                <div className={styles.demoLabel}>Demo · datos de ejemplo</div>
                <div className={styles.photo} />
                <div className={styles.shade} />
                <div className={styles.profileCopy}>
                  <div className={styles.name}><strong>Lucía, 27</strong><b>✓</b></div>
                  <p>Miraflores · 1–3 km</p>
                  <div className={styles.tags}><span>Café</span><span>Viajes</span><span>Música</span></div>
                  <div className={styles.compatibility}>🔥 91% compatibilidad</div>
                </div>
              </article>
              <div className={styles.swipeButtons} aria-hidden="true"><span>×</span><span>🔥</span><span>♡</span></div>
            </div>
          </div>
        </section>

        <section className={styles.socialDNA} aria-label="Arquitectura social">
          {socialDNA.map(item=><article key={item.title}><span>{item.icon}</span><div><strong>{item.title}</strong><p>{item.copy}</p></div></article>)}
        </section>

        <section className={styles.featureDock} aria-label="Todas las funciones">
          <div className={styles.dockTitle}><strong>Todo está a un toque</strong><span>Cada función tiene su propia pantalla y ruta independiente.</span></div>
          <div className={styles.featureRail}>
            {publicFeatures.map((feature) => (
              <Link className={styles.featureCard} href={feature.slug} key={feature.slug}>
                <span className={styles.featureIcon}>{feature.icon}</span>
                <div><strong>{feature.label}</strong><small>{feature.eyebrow}</small></div>
                <b>›</b>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <span>© CitaFuego · Solo 18+</span>
        <div><Link href="/safety">Seguridad</Link><Link href="/privacidad">Privacidad</Link><Link href="/terminos">Términos</Link><Link href="/help">Ayuda</Link></div>
      </footer>
    </main>
  );
}
