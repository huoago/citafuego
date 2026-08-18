import Link from 'next/link';
import { AuthMethodSwitcher } from '@/components/auth/auth-method-switcher';
import { getAuthProviderReadiness } from '@/lib/auth/provider-readiness';

type PageProps={searchParams:Promise<{error?:string|string[]}>};

function registrationError(value:string|undefined){
 if(value==='expired_or_invalid_link')return 'Ese enlace ya no es válido. Solicita un nuevo código para continuar.';
 if(value==='browser_mismatch')return 'La verificación se abrió en un navegador distinto. Vuelve a esta pantalla y solicita un nuevo código.';
 return null;
}

function registrationIntro(readiness:Awaited<ReturnType<typeof getAuthProviderReadiness>>){
 if(readiness.phone&&readiness.emailRegistration)return 'Elige correo o teléfono. Por correo recibirás un código de 6 dígitos.';
 if(readiness.phone)return 'Regístrate con tu número de celular. Te enviaremos un código por SMS.';
 if(readiness.emailRegistration)return 'Regístrate con tu correo. Recibirás un código de 6 dígitos para verificar tu cuenta.';
 if(readiness.google)return 'Continúa con Google para crear tu cuenta.';
 return 'El registro por correo está en preparación. Vuelve a intentarlo más tarde.';
}

export default async function Page({searchParams}:PageProps){
 const turnstileSiteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()??'';
 const readiness=await getAuthProviderReadiness();
 const params=await searchParams;
 const rawError=Array.isArray(params.error)?params.error[0]:params.error;
 const error=registrationError(rawError);
 return <main className="authPage authRegistrationPage"><div className="authCard authCardRegistration">
  <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
  <div className="registrationHeading">
   <p className="eyebrow">Registro · Solo mayores de 18</p>
   <h1>Crea tu cuenta</h1>
   <p className="muted authIntro">{registrationIntro(readiness)}</p>
  </div>
  {error?<div className="authInlineAlert" role="alert"><strong>No pudimos completar la verificación.</strong><span>{error}</span></div>:null}
  <AuthMethodSwitcher mode="register" turnstileSiteKey={turnstileSiteKey} readiness={readiness}/>
  <p className="authFoot">¿Ya tienes cuenta? <Link href="/iniciar-sesion">Inicia sesión</Link></p>
 </div></main>;
}
