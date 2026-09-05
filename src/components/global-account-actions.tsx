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
    <a data-account-guest href="/guardados" className="globalSiteIconButton" aria-label="Guardados" title="Guardados">♡</a>
    <a data-account-guest href="/registro" className="globalSitePrimaryButton">+ Crear perfil</a>
    <details data-account-guest className="globalSiteMenu"><summary aria-label="Abrir menú">☰</summary><div className="globalSiteMenuPanel"><a href="/">Inicio</a><a href="/iniciar-sesion">Iniciar sesión</a><a href="/registro">Crear perfil</a><a href="/explorar">Explorar</a><a href="/community-guidelines">Normas de la comunidad</a><a href="/seguridad-privacidad">Privacidad</a></div></details>

    <a data-account-auth hidden href="/guardados" className="globalSiteIconButton" aria-label="Guardados" title="Guardados">♡</a>
    <a data-account-auth hidden href="/perfil" className="globalSitePrimaryButton globalAccountPrimary">Mi perfil</a>
    <details data-account-auth hidden className="globalSiteMenu"><summary aria-label="Abrir menú de cuenta">☰</summary><div className="globalSiteMenuPanel"><a href="/perfil">Mi perfil</a><a href="/descubrir">Descubrir</a><a href="/matches">Matches</a><a href="/chats">Chats</a><a href="/notificaciones">Notificaciones</a><a href="/guardados">Guardados</a><a data-account-admin hidden href="/admin">Administración</a><a href="/logout">Cerrar sesión</a></div></details>

    <script dangerouslySetInnerHTML={{__html:accountStateScript}}/>
  </nav>;
}
