import Link from 'next/link';
import { AuthMethodSwitcher } from '@/components/auth/auth-method-switcher';
import { getAuthProviderReadiness } from '@/lib/auth/provider-readiness';
import styles from './login.module.css';

type PageProps={searchParams:Promise<{error?:string|string[];from?:string|string[]}>};

function loginError(value:string|undefined){
 if(value==='browser_mismatch')return {title:'El enlace se abrió en otro navegador.',body:'Tu correo puede estar confirmado, pero la sesión no pudo completarse. Solicita un nuevo enlace desde este navegador y abre aquí el siguiente correo.'};
 if(value==='expired_or_invalid_link')return {title:'Ese enlace ya no es válido.',body:'Los enlaces son de un solo uso. Solicita uno nuevo para entrar.'};
 if(value==='session_failed')return {title:'No pudimos abrir tu sesión.',body:'Solicita un nuevo enlace e inténtalo otra vez.'};
 return null;
}

export default async function Page({searchParams}:PageProps){
 const readiness=await getAuthProviderReadiness();
 const params=await searchParams;
 const rawError=Array.isArray(params.error)?params.error[0]:params.error;
 const error=loginError(rawError);
 return <main className={styles.page}>
  <section className={styles.card} aria-labelledby="login-title">
   <header className={styles.header}>
    <Link href="/" className={styles.brand}><span aria-hidden="true">🔥</span><span>CitaFuego</span></Link>
    <span className={styles.securityPill}>
      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      Acceso privado
    </span>
    <h1 id="login-title" className={styles.title}>Bienvenido de nuevo</h1>
    <p className={styles.subtitle}>Elige cómo quieres entrar. Solo mostramos métodos disponibles para tu cuenta.</p>
   </header>

   {error?<div className={`${styles.alert} authInlineAlert`} role="alert"><strong>{error.title}</strong><span>{error.body}</span></div>:null}

   <AuthMethodSwitcher mode="login" readiness={readiness}/>

   <div className={styles.securityNote}>
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3 5 6v5c0 4.8 2.9 8.1 7 10 4.1-1.9 7-5.2 7-10V6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="m9.5 12 1.7 1.7 3.6-3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
    <span>No compartiremos tu número o correo en tu perfil. Nunca te pediremos una contraseña por mensaje.</span>
   </div>

   <p className={styles.footer}>¿Aún no tienes cuenta? <Link href="/registro">Crear cuenta</Link></p>
  </section>
 </main>;
}
