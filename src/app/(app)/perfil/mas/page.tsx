import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { isCreatorProgramEnabled } from '@/lib/features/creator-program';

const SettingLink=({href,children}:{href:string;children:React.ReactNode})=><Link href={href}>{children}<span aria-hidden="true">›</span></Link>;

export default async function Page(){
  const id=await getAuthenticatedUserId();
  if(!id)redirect('/iniciar-sesion');
  const creatorProgramEnabled=isCreatorProgramEnabled();
  return <section>
    <div className="pageHeader"><p className="eyebrow">Configuración secundaria</p><h1>Más ajustes</h1><p className="muted">Herramientas opcionales y funciones profesionales separadas de tu perfil principal.</p></div>
    <Link className="ghostButton backToProfile" href="/perfil">← Volver a Perfil</Link>
    <div className="profileSettingsGroups compactSettingsGroups">
      <section className="settingsSection"><header><div><h2>Herramientas opcionales</h2><p>Úsalas cuando las necesites; no forman parte del flujo principal.</p></div></header><div className="settingsList"><SettingLink href="/azar">Conexión al azar</SettingLink><SettingLink href="/boost">⚡ Activar Boost</SettingLink><SettingLink href="/tienda">Tienda de extras</SettingLink></div></section>
      <section className="settingsSection"><header><div><h2>Uso profesional</h2><p>Opciones para anunciantes y creadores. No afectan tu experiencia de citas.</p></div></header><div className="settingsList"><SettingLink href="/anunciantes">Centro de anunciantes</SettingLink>{creatorProgramEnabled?<><SettingLink href="/creadores">Centro de creadores</SettingLink><SettingLink href="/creadores/comercial">Monetización y KYC</SettingLink><SettingLink href="/creadores/oportunidades">Oportunidades de marca</SettingLink></>:null}</div></section>
    </div>
  </section>;
}
