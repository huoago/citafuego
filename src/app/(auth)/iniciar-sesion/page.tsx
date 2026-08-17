import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';

export default function Page(){return <main className="authPage"><div className="authCard">
 <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
 <p className="eyebrow">Acceso seguro</p><h1>Qué bueno verte</h1>
 <p className="muted">Escribe tu email y te enviaremos un enlace de acceso. No necesitas recordar una contraseña.</p>
 <div className="authTrust"><span>Enlace de un solo uso</span><span>Sin contraseña</span><span>Sesión protegida</span></div>
 <LoginForm/>
 <div className="authHint"><span aria-hidden="true">↗</span><span>Abre el enlace en este mismo dispositivo para continuar directamente a tu cuenta.</span></div>
 <p className="authFoot">¿Primera vez aquí? <Link href="/registro">Crear perfil</Link></p>
 </div></main>}
