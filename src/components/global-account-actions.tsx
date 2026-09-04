'use client';

import Link from 'next/link';
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
    const initial=window.setTimeout(()=>void refresh(),0);
    const onPageShow=()=>void refresh();
    const onVisibility=()=>{if(document.visibilityState==='visible')void refresh();};
    window.addEventListener('pageshow',onPageShow);
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{window.clearTimeout(initial);window.removeEventListener('pageshow',onPageShow);document.removeEventListener('visibilitychange',onVisibility);};
  },[refresh]);

  if(state===null)return <nav className="globalSiteActions" aria-label="Acciones de cuenta" data-account-state="loading">
    <Link href="/guardados" className="globalSiteIconButton" aria-label="Guardados" title="Guardados">♡</Link>
    <span className="globalAccountLoading" aria-label="Comprobando sesión">Cuenta</span>
    <details className="globalSiteMenu"><summary aria-label="Abrir menú">☰</summary><div className="globalSiteMenuPanel"><Link href="/">Inicio</Link><Link href="/safety">Seguridad</Link><Link href="/help">Ayuda</Link></div></details>
  </nav>;

  if(!state.authenticated)return <nav className="globalSiteActions" aria-label="Acciones de cuenta" data-account-state="guest">
    <Link href="/guardados" className="globalSiteIconButton" aria-label="Guardados" title="Guardados">♡</Link>
    <Link href="/registro" className="globalSitePrimaryButton">+ Crear perfil</Link>
    <details className="globalSiteMenu"><summary aria-label="Abrir menú">☰</summary><div className="globalSiteMenuPanel"><Link href="/">Inicio</Link><Link href="/iniciar-sesion">Iniciar sesión</Link><Link href="/registro">Crear perfil</Link><Link href="/explorar">Explorar</Link><Link href="/community-guidelines">Normas de la comunidad</Link><Link href="/seguridad-privacidad">Privacidad</Link></div></details>
  </nav>;

  return <nav className="globalSiteActions" aria-label="Acciones de cuenta" data-account-state="authenticated">
    <Link href="/guardados" className="globalSiteIconButton" aria-label="Guardados" title="Guardados">♡</Link>
    <Link href="/perfil" className="globalSitePrimaryButton globalAccountPrimary">Mi perfil</Link>
    <details className="globalSiteMenu"><summary aria-label="Abrir menú de cuenta">☰</summary><div className="globalSiteMenuPanel"><Link href="/perfil">Mi perfil</Link><Link href="/descubrir">Descubrir</Link><Link href="/matches">Matches</Link><Link href="/chats">Chats</Link><Link href="/notificaciones">Notificaciones</Link><Link href="/guardados">Guardados</Link>{state.admin?<Link href="/admin">Administración</Link>:null}<form className="globalSiteLogoutForm" action="/logout" method="post"><button className="globalSiteLogoutButton" type="submit">Cerrar sesión</button></form></div></details>
  </nav>;
}
