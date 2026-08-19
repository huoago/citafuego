import Link from 'next/link';
import {RecoveryForm} from '@/components/auth/recovery-form';

export default function Page(){return <main className="authPage"><section className="authCard"><p className="eyebrow">Recuperación de cuenta</p><h1>Restablece tu contraseña</h1><p className="muted">Escribe tu nombre de cuenta. Si tienes un correo de recuperación vinculado, recibirás allí el enlace.</p><RecoveryForm/><p className="muted"><Link href="/iniciar-sesion">← Volver a iniciar sesión</Link></p></section></main>}
