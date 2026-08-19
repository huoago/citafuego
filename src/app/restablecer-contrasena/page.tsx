import Link from 'next/link';
import {ResetPasswordForm} from '@/components/auth/reset-password-form';

export default function Page(){return <main className="authPage"><section className="authCard"><p className="eyebrow">Seguridad de cuenta</p><h1>Nueva contraseña</h1><p className="muted">Elige una contraseña nueva para tu cuenta CitaFuego.</p><ResetPasswordForm/><p className="muted"><Link href="/iniciar-sesion">Volver a iniciar sesión</Link></p></section></main>}
