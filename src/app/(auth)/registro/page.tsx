import Link from 'next/link';
import { AuthMethodSwitcher } from '@/components/auth/auth-method-switcher';

export default function Page(){
 const turnstileSiteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()??'';
 return <main className="authPage"><div className="authCard">
  <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
  <p className="eyebrow">Empieza tu registro · 18+</p>
  <h1>Crea tu perfil</h1>
  <p className="muted">Elige una forma de registro. Con Email confirmas edad y consentimientos aquí; con Teléfono o Google tendrás un segundo y último paso antes de crear tu perfil.</p>
  <div className="authTrust" aria-label="Controles de confianza"><span>Acceso seguro</span><span>Edad 18+</span><span>Privacidad</span></div>
  <AuthMethodSwitcher mode="register" turnstileSiteKey={turnstileSiteKey}/>
  <div className="authHint"><span aria-hidden="true">✓</span><span>Tu fecha de nacimiento se usa únicamente para validar la edad y no se muestra públicamente.</span></div>
  <p className="authFoot">¿Ya tienes cuenta? <Link href="/iniciar-sesion">Inicia sesión</Link></p>
 </div></main>;
}
