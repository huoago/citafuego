import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
export default function Page(){return <main className="authPage"><div className="authCard"><Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link><p className="eyebrow">Bienvenido</p><h1>Inicia sesión</h1><LoginForm/><p className="authFoot">¿No tienes cuenta? <Link href="/registro">Regístrate</Link></p></div></main>}
