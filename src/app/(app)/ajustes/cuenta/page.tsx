import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {AccountSecurityClient} from '@/components/settings/account-security-client';

export const dynamic='force-dynamic';
export default async function Page(){
  const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)redirect('/iniciar-sesion');
  const{data:account}=await s.from('account_usernames').select('username').eq('user_id',user.id).maybeSingle();
  const email=user.email??'';const recoveryEmail=email.endsWith('@accounts.citafuego.invalid')?'':email;
  return <section className="settingsCenter">
    <div className="pageHeader settingsTitleRow"><div><p className="eyebrow">Seguridad de cuenta</p><h1>Acceso y recuperación</h1><p className="muted">Cambia tu contraseña y vincula un correo privado para recuperación.</p></div><Link className="ghostButton" href="/ajustes">← Configuración</Link></div>
    <AccountSecurityClient username={account?.username??'Cuenta CitaFuego'} initialRecoveryEmail={recoveryEmail}/>
  </section>;
}
