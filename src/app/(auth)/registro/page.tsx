import Link from 'next/link';
import { AuthMethodSwitcher } from '@/components/auth/auth-method-switcher';
import { getAuthProviderReadiness } from '@/lib/auth/provider-readiness';

type PageProps={searchParams:Promise<{error?:string|string[]}>};

function registrationError(value:string|undefined){
 if(value==='expired_or_invalid_link')return 'Ese enlace ya no es válido. Solicita uno nuevo para continuar.';
 if(value==='browser_mismatch')return 'El enlace se abrió en un navegador distinto al que inició el registro. Solicita un nuevo enlace desde esta pantalla.';
 return null;
}

function registrationIntro(readiness:Awaited<ReturnType<typeof getAuthProviderReadiness>>){
 if(readiness.phone&&readiness.emailRegistration)return 'Elige correo o teléfono. Solo mostramos las opciones que están disponibles ahora.';
 if(readiness.phone)return 'Regístrate con tu número de celular. Te enviaremos un código por SMS.';
 if(readiness.emailRegistration)return 'Regístrate con tu correo electrónico y confirma el enlace que te enviaremos.';
 if(readiness.google)return 'Continúa con Google para crear tu cuenta.';
 return 'El registro está temporalmente no disponible.';
}

export default async function Page({searchParams}:PageProps){
 const turnstileSiteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()??'';
 const readiness=await getAuthProviderReadiness();
 const params=await searchParams;
 const rawError=Array.isArray(params.error)?params.error[0]:params.error;
 const error=registrationError(rawError);
 return <main className="authPage"><div className="authCard authCardRegistration">
  <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
  <p className="eyebrow">Registro · Solo mayores de 18</p>
  <h1>Crea tu cuenta</h1>
  <p className="muted authIntro">{registrationIntro(readiness)}</p>
  {error?<div className="authInlineAlert" role="alert"><strong>No pudimos completar ese enlace.</strong><span>{error}</span></div>:null}
  <AuthMethodSwitcher mode="register" turnstileSiteKey={turnstileSiteKey} readiness={readiness}/>
  <p className="authFoot">¿Ya tienes cuenta? <Link href="/iniciar-sesion">Inicia sesión</Link></p>
 </div></main>;
}
