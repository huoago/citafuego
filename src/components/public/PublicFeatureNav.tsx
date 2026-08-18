import Link from 'next/link';
import styles from './public-feature.module.css';

const primaryLinks=[
  {href:'/como-funciona',label:'Cómo funciona'},
  {href:'/safety',label:'Seguridad'},
  {href:'/blog-info',label:'Comunidad'},
] as const;

export function PublicFeatureNav() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="CitaFuego inicio">
        <span className={styles.brandMark}>🔥</span><span>CitaFuego</span>
      </Link>
      <div className={styles.navViewport} aria-label="Información principal de CitaFuego">
        <nav className={styles.nav}>
          {primaryLinks.map((item)=><Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
      </div>
      <div className={styles.actions}>
        <Link className={styles.login} href="/iniciar-sesion">Entrar</Link>
        <Link className={styles.join} href="/registro">Crear perfil</Link>
      </div>
    </header>
  );
}
