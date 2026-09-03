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
      <a href="/" className="globalSiteBrand" aria-label="CitaFuego · volver al inicio" data-home-link>
        <span className="globalSiteBrandMark" aria-hidden="true"><span className="globalSiteBrandMascot"/></span><strong>CitaFuego</strong>
      </a>
      <nav className="globalSitePrimary" aria-label="Navegación principal">
        {primary.map(item=><a key={item.href} href={item.href}>{item.label}</a>)}
      </nav>
      <nav className="globalSiteActions" aria-label="Acciones de cuenta">
        <a href="/guardados" className="globalSiteIconButton" aria-label="Guardados" title="Guardados">♡</a>
        <a href="/registro" className="globalSitePrimaryButton">+ Crear perfil</a>
        <details className="globalSiteMenu">
          <summary aria-label="Abrir menú">☰</summary>
          <div className="globalSiteMenuPanel">
            <a href="/">Inicio</a>
            <a href="/iniciar-sesion">Iniciar sesión</a>
            <a href="/registro">Crear perfil</a>
            <a href="/descubrir">Descubrir</a>
            <a href="/perfil">Mi perfil</a>
            <a href="/community-guidelines">Normas de la comunidad</a>
            <a href="/seguridad-privacidad">Privacidad</a>
          </div>
        </details>
      </nav>
    </div>
  </header>;
}
