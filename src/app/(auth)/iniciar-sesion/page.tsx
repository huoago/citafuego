import Link from 'next/link';
import { AuthMethodSwitcher } from '@/components/auth/auth-method-switcher';
import { getAuthProviderReadiness } from '@/lib/auth/provider-readiness';

type PageProps={searchParams:Promise<{error?:string|string[];from?:string|string[]}>};

function loginError(value:string|undefined){
 if(value==='browser_mismatch')return {title:'Tu correo ya puede estar confirmado.',body:'El enlace se abrió en un navegador distinto al que inició el registro. Solicita un nuevo enlace desde este navegador y abre el siguiente correo aquí.'};
 if(value==='expired_or_invalid_link')return {title:'Ese enlace ya no es válido.',body:'Los enlaces son de un solo uso. Solicita uno nuevo para entrar.'};
 if(value==='session_failed')return {title:'No pudimos abrir tu sesión.',body:'Solicita un nuevo enlace e inténtalo otra vez.'};
 return null;
}

export default async function Page({searchParams}:PageProps){
 const readiness=await getAuthProviderReadiness();
 const params=await searchParams;
 const rawError=Array.isArray(params.error)?params.error[0]:params.error;
 const error=loginError(rawError);
 return <main className="authPage"><div className="authCard">
 <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
 <p className="eyebrow">Acceso seguro</p><h1>Qué bueno verte</h1>
 <p className="muted authIntro">Entra con el mismo método que usaste al crear tu cuenta.</p>
 {error?<div className="authInlineAlert" role="alert"><strong>{error.title}</strong><span>{error.body}</span></div>:null}
 <AuthMethodSwitcher mode="login" readiness={readiness}/>
 <p className="authLinkTip">Los enlaces por correo son de un solo uso. Ábrelos en el mismo navegador desde el que los solicitaste.</p>
 <p className="authFoot">¿Primera vez aquí? <Link href="/registro">Crear cuenta</Link></p>
 </div></main>}
