/* eslint-disable @next/next/no-html-link-for-pages */

const accountStateScript=String.raw`(()=>{
  const init=()=>{
    const root=document.querySelector('[data-global-account-actions]');
    if(!root||root.dataset.bound==='true')return;
    root.dataset.bound='true';

    const render=(state)=>{
      const authenticated=state?.authenticated===true;
      root.querySelectorAll('[data-account-guest]').forEach((node)=>{node.hidden=authenticated;});
      root.querySelectorAll('[data-account-auth]').forEach((node)=>{node.hidden=!authenticated;});
      const admin=root.querySelector('[data-account-admin]');
      if(admin)admin.hidden=!(authenticated&&state?.admin===true);
      const summary=root.querySelector('.globalSiteMenu summary');
      if(summary)summary.setAttribute('aria-label',authenticated?'Abrir menú de cuenta':'Abrir menú');
      root.dataset.accountState=authenticated?'authenticated':'guest';
    };

    const refresh=async()=>{
      const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}}).catch(()=>null);
      if(!response?.ok){render(null);return;}
      const data=await response.json().catch(()=>null);
      render(data);
    };

    void refresh();
    window.addEventListener('pageshow',()=>void refresh());
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refresh();});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();`;

export function GlobalAccountActions(){
  return <nav className="globalSiteActions" aria-label="Acciones de cuenta" data-global-account-actions data-account-state="guest">
    <a href="/guardados" className="globalSiteIconButton" aria-label="Guardados" title="Guardados">♡</a>
    <a data-account-guest href="/registro" className="globalSitePrimaryButton">+ Crear perfil</a>
    <a data-account-auth hidden href="/perfil" className="globalSitePrimaryButton globalAccountPrimary">Mi perfil</a>
    <details className="globalSiteMenu"><summary aria-label="Abrir menú">☰</summary><div className="globalSiteMenuPanel">
      <a href="/">Inicio</a>
      <a data-account-guest href="/iniciar-sesion">Iniciar sesión</a>
      <a data-account-guest href="/registro">Crear perfil</a>
      <a data-account-guest href="/explorar">Explorar</a>
      <a data-account-guest href="/community-guidelines">Normas de la comunidad</a>
      <a data-account-guest href="/seguridad-privacidad">Privacidad</a>
      <a data-account-auth hidden href="/perfil">Mi perfil</a>
      <a data-account-auth hidden href="/descubrir">Descubrir</a>
      <a data-account-auth hidden href="/matches">Matches</a>
      <a data-account-auth hidden href="/chats">Chats</a>
      <a data-account-auth hidden href="/notificaciones">Notificaciones</a>
      <a data-account-auth hidden href="/guardados">Guardados</a>
      <a data-account-admin hidden href="/admin">Administración</a>
      <a data-account-auth hidden href="/logout">Cerrar sesión</a>
    </div></details>
    <script dangerouslySetInnerHTML={{__html:accountStateScript}}/>
  </nav>;
}
