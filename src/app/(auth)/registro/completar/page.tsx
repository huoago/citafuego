import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CompleteRegistrationForm } from '@/components/auth/complete-registration-form';

export const dynamic='force-dynamic';

export default async function Page(){
  const s=await createClient();
  const{data:{user}}=await s.auth.getUser();
  if(!user)redirect('/iniciar-sesion');
  const{data:privateRow}=await s.from('user_private').select('user_id').eq('user_id',user.id).maybeSingle();
  if(privateRow){const{data:profile}=await s.from('profiles').select('status').eq('id',user.id).maybeSingle();redirect(profile?.status==='active'?'/descubrir':'/onboarding')}
  return <main className="authPage"><div className="authCard">
    <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
    <p className="eyebrow">Último paso · 18+</p><h1>Completa tu registro</h1>
    <p className="muted">Tu cuenta de Google o teléfono ya fue verificada. Falta confirmar edad y consentimientos antes de crear el perfil.</p>
    <div className="authTrust"><span>18+ obligatorio</span><span>Consentimiento explícito</span><span>Datos privados</span></div>
    <CompleteRegistrationForm/>
  </div></main>;
}
