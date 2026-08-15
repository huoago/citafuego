import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';
export default function Page(){return <main className="authPage"><div className="authCard"><Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link><p className="eyebrow">Empieza aquí</p><h1>Crea tu cuenta</h1><p className="muted">Solo para mayores de 18 años. Tu fecha de nacimiento no aparece en tu perfil.</p><RegisterForm/><p className="authFoot">¿Ya tienes cuenta? <Link href="/iniciar-sesion">Inicia sesión</Link></p></div></main>}
