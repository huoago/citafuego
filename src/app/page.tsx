import Link from 'next/link';
import {HomeDirectoryControls} from '@/components/public/HomeDirectoryControls';
import styles from './home.module.css';

const districtLinks=[
  ['Miraflores','/lima/miraflores'],['Surco','/lima/santiago-de-surco'],['San Borja','/lima/san-borja'],['Barranco','/lima/barranco'],
  ['Lince','/lima/lince'],['La Molina','/lima/la-molina'],['Jesús María','/lima/jesus-maria'],['San Isidro','/lima/san-isidro'],
] as const;

export default function LandingPage(){
  return <main className={styles.page}>
    <div className={styles.trustStrip}>🔥 CitaFuego · Solo adultos 18+ · perfiles y contenido sujetos a controles de seguridad y moderación</div>

    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="CitaFuego inicio"><span>🔥</span><strong>CitaFuego</strong></Link>
      <nav className={styles.headerActions} aria-label="Acciones principales">
        <Link href="/guardados" className={styles.headerIcon} aria-label="Guardados" title="Guardados">♡</Link>
        <Link href="/registro" className={styles.publishButton}>+ Crear perfil</Link>
        <details className={styles.menu}>
          <summary aria-label="Abrir menú">☰</summary>
          <div className={styles.menuPanel}>
            <Link href="/iniciar-sesion">Iniciar sesión</Link>
            <Link href="/registro">Crear perfil</Link>
            <Link href="/como-funciona">Cómo funciona</Link>
            <Link href="/safety">Seguridad</Link>
            <Link href="/help">Ayuda</Link>
          </div>
        </details>
      </nav>
    </header>

    <div className={styles.shell}>
      <HomeDirectoryControls/>

      <section className={styles.explainer} aria-labelledby="citas-lima">
        <p className={styles.eyebrow}>CitaFuego en Lima</p>
        <h2 id="citas-lima">Conoce personas reales con más contexto antes de conversar</h2>
        <p>CitaFuego está diseñado como una plataforma de citas y conexiones entre adultos. La experiencia prioriza intención de relación, distrito aproximado, intereses, señales de verificación y controles de privacidad. No publicamos direcciones exactas ni convertimos los perfiles en anuncios de servicios.</p>
        <div className={styles.explainerGrid}>
          <article><strong>Explora</strong><span>Filtra por zona, intención y señales de confianza.</span></article>
          <article><strong>Conecta</strong><span>Like mutuo antes de abrir una conversación privada.</span></article>
          <article><strong>Controla</strong><span>Bloqueo, denuncia, verificación y privacidad desde la cuenta.</span></article>
        </div>
      </section>

      <section className={styles.linkSection} aria-label="Distritos de Lima">
        <h2>Distritos principales de Lima</h2>
        <div className={styles.linkCloud}>{districtLinks.map(([label,href])=><Link href={href} key={href}>{label}</Link>)}<Link href="/lima">+ Ver todos</Link></div>
      </section>

      <section className={styles.linkSection} aria-label="Funciones más usadas">
        <h2>Lo más usado en CitaFuego</h2>
        <div className={styles.linkCloud}>
          <Link href="/verificacion">Perfiles verificados</Link>
          <Link href="/como-funciona">Cómo funciona</Link>
          <Link href="/seguridad-privacidad">Privacidad</Link>
          <Link href="/safety">Consejos de seguridad</Link>
          <Link href="/guias">Guías para citas</Link>
          <Link href="/registro">Crear perfil</Link>
        </div>
      </section>
    </div>

    <footer className={styles.footer}>
      <div><strong>🔥 CitaFuego</strong><span>Contenido y comunidad solo para mayores de 18 años.</span></div>
      <nav><Link href="/terminos">Términos</Link><Link href="/privacidad">Privacidad</Link><Link href="/community-guidelines">Comunidad</Link><Link href="/safety">Seguridad</Link><Link href="/help">Ayuda</Link></nav>
    </footer>
  </main>;
}
