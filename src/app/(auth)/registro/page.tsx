import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';
import { PhoneAuthForm } from '@/components/auth/phone-auth-form';

export default function Page(){
 const turnstileSiteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()??'';
 return <main className="authPage"><div className="authCard">
  <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
  <p className="eyebrow">Tu cuenta · 18+</p>
  <h1>Crea tu perfil</h1>
  <p className="muted">Elige email, teléfono o Google. Antes de aparecer en Descubrir siempre validamos 18+ y registramos tus consentimientos.</p>
  <div className="authTrust" aria-label="Controles de confianza"><span>Email seguro</span><span>SMS OTP</span><span>Google</span><span>Edad 18+</span></div>
  <SocialAuthButtons mode="register"/>
  <PhoneAuthForm mode="register"/>
  <div className="authDivider"><span>o con email</span></div>
  <RegisterForm turnstileSiteKey={turnstileSiteKey}/>
  <div className="authHint"><span aria-hidden="true">✓</span><span>Tu fecha de nacimiento se usa únicamente para validar la edad y no se muestra públicamente.</span></div>
  <p className="authFoot">¿Ya tienes cuenta? <Link href="/iniciar-sesion">Inicia sesión</Link></p>
 </div></main>;
}
