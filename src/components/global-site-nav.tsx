/* eslint-disable @next/next/no-html-link-for-pages */
import {GlobalAccountActions} from '@/components/global-account-actions';

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
      <GlobalAccountActions/>
    </div>
  </header>;
}
