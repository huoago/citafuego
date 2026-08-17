import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';
import { PhoneAuthForm } from '@/components/auth/phone-auth-form';

export default function Page(){return <main className="authPage"><div className="authCard">
 <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
 <p className="eyebrow">Acceso seguro</p><h1>Qué bueno verte</h1>
 <p className="muted">Entra con el método que vinculaste a tu cuenta. Email sigue funcionando sin contraseña.</p>
 <div className="authTrust"><span>Email Magic Link</span><span>SMS OTP</span><span>Google</span><span>Sesión protegida</span></div>
 <SocialAuthButtons mode="login"/>
 <PhoneAuthForm mode="login"/>
 <div className="authDivider"><span>o con email</span></div>
 <LoginForm/>
 <div className="authHint"><span aria-hidden="true">↗</span><span>Si usas email, abre el enlace en este mismo dispositivo para continuar directamente a tu cuenta.</span></div>
 <p className="authFoot">¿Primera vez aquí? <Link href="/registro">Crear perfil</Link></p>
 </div></main>}
