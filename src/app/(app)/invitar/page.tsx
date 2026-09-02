import { redirect } from 'next/navigation';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { ReferralShare } from '@/components/growth/referral-share';

export const dynamic='force-dynamic';

export default async function InvitePage(){
  const userId=await getAuthenticatedUserId();
  if(!userId)redirect('/iniciar-sesion');
  const supabase=await createClient();
  const{data:code,error}=await supabase.rpc('get_my_referral_code');
  if(error||typeof code!=='string')return <section className="referralPage"><div className="pageHeader"><p className="eyebrow">Invita y crece</p><h1>Invita a un amigo</h1><p>No pudimos preparar tu enlace. Inténtalo de nuevo más tarde.</p></div></section>;
  const url=`https://citafuego.com/registro?ref=${encodeURIComponent(code)}`;
  const{count}=await supabase.from('referral_attributions').select('invited_user_id',{count:'exact',head:true}).eq('inviter_user_id',userId).not('rewarded_at','is',null);
  return <section className="referralPage">
    <div className="pageHeader"><p className="eyebrow">Invita y crece</p><h1>Invita a un amigo</h1><p>Cuando una persona se registre con tu enlace y active su perfil, tu perfil obtiene prioridad en su ciudad durante <strong>7 días</strong>.</p></div>
    <ReferralShare url={url}/>
    <div className="referralRewardPanel"><strong>{count??0}</strong><span>invitaciones confirmadas</span><p>Cada amigo confirmado suma una semana adicional. Las semanas se acumulan automáticamente.</p></div>
    <div className="softPanel"><strong>Cómo funciona</strong><p>Comparte tu enlace. El amigo debe crear su propia cuenta de adulto y completar los requisitos de activación. No se concede recompensa por auto-invitaciones ni por repetir la misma cuenta.</p></div>
  </section>;
}
