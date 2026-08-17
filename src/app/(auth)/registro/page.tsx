import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';

export default function Page(){
 const turnstileSiteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()??'';
 return <main className="authPage"><div className="authCard">
  <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
  <p className="eyebrow">Tu cuenta · 18+</p>
  <h1>Crea tu perfil</h1>
  <p className="muted">Empieza con un enlace seguro por email. Después completas perfil, fotos y verificación antes de aparecer en Discovery.</p>
  <div className="authTrust" aria-label="Controles de confianza"><span>Sin contraseña</span><span>Edad 18+</span><span>Ubicación aproximada</span><span>Fotos privadas</span></div>
  <RegisterForm turnstileSiteKey={turnstileSiteKey}/>
  <div className="authHint"><span aria-hidden="true">✓</span><span>Tu fecha de nacimiento se usa para validar la edad y no se muestra públicamente en tu perfil.</span></div>
  <p className="authFoot">¿Ya tienes cuenta? <Link href="/iniciar-sesion">Inicia sesión</Link></p>
 </div></main>;
}
