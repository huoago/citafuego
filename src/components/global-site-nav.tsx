import Link from 'next/link';

const primary=[
  {href:'/',label:'Inicio'},
  {href:'/explorar',label:'Explorar'},
  {href:'/como-funciona',label:'Cómo funciona'},
  {href:'/safety',label:'Seguridad'},
  {href:'/help',label:'Ayuda'},
];

export function GlobalSiteNav(){
  return <header className="globalSiteNav" data-global-site-nav>
    <div className="globalSiteNavInner">
      <Link href="/" className="globalSiteBrand" aria-label="CitaFuego · volver al inicio" data-home-link>
        <span className="globalSiteBrandMark" aria-hidden="true">🔥</span><strong>CitaFuego</strong>
      </Link>
      <nav className="globalSitePrimary" aria-label="Navegación principal">
        {primary.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}
      </nav>
      <nav className="globalSiteActions" aria-label="Acciones de cuenta">
        <Link href="/guardados" className="globalSiteIconButton" aria-label="Guardados" title="Guardados">♡</Link>
        <Link href="/registro" className="globalSitePrimaryButton">+ Crear perfil</Link>
        <details className="globalSiteMenu">
          <summary aria-label="Abrir menú">☰</summary>
          <div className="globalSiteMenuPanel">
            <Link href="/">Inicio</Link>
            <Link href="/iniciar-sesion">Iniciar sesión</Link>
            <Link href="/registro">Crear perfil</Link>
            <Link href="/descubrir">Descubrir</Link>
            <Link href="/perfil">Mi perfil</Link>
            <Link href="/community-guidelines">Normas de la comunidad</Link>
            <Link href="/seguridad-privacidad">Privacidad</Link>
          </div>
        </details>
      </nav>
    </div>
  </header>;
}
