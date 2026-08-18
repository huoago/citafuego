import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { WhatsAppSettings } from '@/components/profile/whatsapp-settings';

export const dynamic='force-dynamic';

export default async function Page(){
  const userId=await getAuthenticatedUserId();
  if(!userId)redirect('/iniciar-sesion');
  const supabase=await createClient();
  const{data}=await supabase.from('user_private').select('whatsapp_e164,whatsapp_public').eq('user_id',userId).maybeSingle();
  return <section className="whatsappSettingsPage"><div className="pageHeader"><p className="eyebrow">Contacto opcional</p><h1>WhatsApp</h1><p className="muted">Guarda tu WhatsApp y decide tú mismo si aparece en tu perfil.</p></div><WhatsAppSettings initialNumber={data?.whatsapp_e164??''} initialPublic={Boolean(data?.whatsapp_public)}/><Link className="textButton whatsappBackLink" href="/perfil">← Volver a Perfil</Link></section>;
}
