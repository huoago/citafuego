import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { PhoneVerification } from '@/components/verification/phone-verification';
export const dynamic='force-dynamic';
export default async function Page(){const userId=await getAuthenticatedUserId();if(!userId)redirect('/login');const s=await createClient();const{data:{user}}=await s.auth.getUser();const enabled=process.env.PHONE_VERIFICATION_ENABLED==='true';const verified=Boolean(user?.phone&&user.phone_confirmed_at);const masked=user?.phone?`${user.phone.slice(0,4)}••••${user.phone.slice(-2)}`:null;return <section><div className="pageHeader"><p className="eyebrow">Señal privada de confianza</p><h1>Verifica tu teléfono</h1><p className="muted">La verificación por SMS ayuda a reducir cuentas desechables. El número no aparece en tu perfil.</p></div><PhoneVerification enabled={enabled} initialVerified={verified} initialMasked={masked}/><div className="heroActions"><Link className="ghostButton" href="/perfil/verificacion-identidad">Verificación de identidad</Link><Link className="ghostButton" href="/perfil">Volver al perfil</Link></div></section>}
