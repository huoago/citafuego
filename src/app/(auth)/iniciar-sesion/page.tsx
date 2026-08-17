import Link from 'next/link';
import { AuthMethodSwitcher } from '@/components/auth/auth-method-switcher';

export default function Page(){return <main className="authPage"><div className="authCard">
 <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
 <p className="eyebrow">Acceso seguro</p><h1>Qué bueno verte</h1>
 <p className="muted">Elige el método vinculado a tu cuenta. Solo mostramos una opción a la vez para que entrar sea rápido y claro.</p>
 <div className="authTrust"><span>Sin contraseña</span><span>Sesión protegida</span><span>Privacidad</span></div>
 <AuthMethodSwitcher mode="login"/>
 <div className="authHint"><span aria-hidden="true">↗</span><span>Si usas email, abre el enlace en este mismo dispositivo para continuar directamente a tu cuenta.</span></div>
 <p className="authFoot">¿Primera vez aquí? <Link href="/registro">Crear perfil</Link></p>
 </div></main>}
