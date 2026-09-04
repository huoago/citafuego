'use client';

import {useCallback,useEffect,useState} from 'react';

type SessionState={authenticated:boolean;admin:boolean};

const guest:SessionState={authenticated:false,admin:false};

export function GlobalAccountActions(){
  const[state,setState]=useState<SessionState|null>(null);
  const refresh=useCallback(async()=>{
    const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}}).catch(()=>null);
    if(!response?.ok){setState(guest);return;}
    const data=await response.json().catch(()=>guest) as Partial<SessionState>;
    setState({authenticated:data.authenticated===true,admin:data.admin===true});
  },[]);

  useEffect(()=>{
    void refresh();
    const onPageShow=()=>void refresh();
    const onVisibility=()=>{if(document.visibilityState==='visible')void refresh();};
    window.addEventListener('pageshow',onPageShow);
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{window.removeEventListener('pageshow',onPageShow);document.removeEventListener('visibilitychange',onVisibility);};
  },[refresh]);

  if(state===null)return <nav className="globalSiteActions" aria-label="Acciones de cuenta" data-account-state="loading">
    <a href="/guardados" className="globalSiteIconButton" aria-label="Guardados" title="Guardados">♡</a>
    <span className="globalAccountLoading" aria-label="Comprobando sesión">Cuenta</span>
    <details className="globalSiteMenu"><summary aria-label="Abrir menú">☰</summary><div className="globalSiteMenuPanel"><a href="/">Inicio</a><a href="/safety">Seguridad</a><a href="/help">Ayuda</a></div></details>
  </nav>;

  if(!state.authenticated)return <nav className="globalSiteActions" aria-label="Acciones de cuenta" data-account-state="guest">
    <a href="/guardados" className="globalSiteIconButton" aria-label="Guardados" title="Guardados">♡</a>
    <a href="/registro" className="globalSitePrimaryButton">+ Crear perfil</a>
    <details className="globalSiteMenu"><summary aria-label="Abrir menú">☰</summary><div className="globalSiteMenuPanel"><a href="/">Inicio</a><a href="/iniciar-sesion">Iniciar sesión</a><a href="/registro">Crear perfil</a><a href="/explorar">Explorar</a><a href="/community-guidelines">Normas de la comunidad</a><a href="/seguridad-privacidad">Privacidad</a></div></details>
  </nav>;

  return <nav className="globalSiteActions" aria-label="Acciones de cuenta" data-account-state="authenticated">
    <a href="/guardados" className="globalSiteIconButton" aria-label="Guardados" title="Guardados">♡</a>
    <a href="/perfil" className="globalSitePrimaryButton globalAccountPrimary">Mi perfil</a>
    <details className="globalSiteMenu"><summary aria-label="Abrir menú de cuenta">☰</summary><div className="globalSiteMenuPanel"><a href="/perfil">Mi perfil</a><a href="/descubrir">Descubrir</a><a href="/matches">Matches</a><a href="/chats">Chats</a><a href="/notificaciones">Notificaciones</a><a href="/guardados">Guardados</a>{state.admin?<a href="/admin">Administración</a>:null}<a href="/logout">Cerrar sesión</a></div></details>
  </nav>;
}
