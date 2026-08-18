import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CompleteRegistrationForm } from '@/components/auth/complete-registration-form';
import {getAuthProviderReadiness} from '@/lib/auth/provider-readiness';
import {isInternalAccountEmail} from '@/lib/auth/account-identity';

export const dynamic='force-dynamic';

export default async function Page(){
  const s=await createClient();
  const{data:{user}}=await s.auth.getUser();
  if(!user)redirect('/iniciar-sesion');
  const{data:privateRow}=await s.from('user_private').select('user_id').eq('user_id',user.id).maybeSingle();
  if(privateRow){const{data:profile}=await s.from('profiles').select('status').eq('id',user.id).maybeSingle();redirect(profile?.status==='active'?'/descubrir':'/onboarding')}
  const readiness=await getAuthProviderReadiness();
  const publicEmail=user.email&&!isInternalAccountEmail(user.email)?user.email:null;
  const publicPhone=user.phone??null;
  return <main className="authPage authRegistrationPage"><div className="authCard authCardRegistration authCompletionCard">
    <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
    <p className="eyebrow">Paso 2 de 2 · Solo mayores de 18</p><h1>Completa tu registro</h1>
    <p className="muted authIntro">Confirma tu edad y consentimientos. Después puedes vincular correo o celular de forma opcional antes de crear tu perfil.</p>
    <div className="authTrust"><span>18+ obligatorio</span><span>Contacto opcional</span><span>Datos privados</span></div>
    <CompleteRegistrationForm readiness={readiness} initialEmail={publicEmail} initialPhone={publicPhone} emailVerified={Boolean(publicEmail&&user.email_confirmed_at)} phoneVerified={Boolean(publicPhone&&user.phone_confirmed_at)}/>
  </div></main>;
}
