import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsClient,type UiPreferences } from '@/components/settings/settings-client';

const defaultLayout:UiPreferences['module_layout']=[
  {id:'completion',colSpan:2,rowSpan:1,visible:true},
  {id:'social',colSpan:2,rowSpan:1,visible:true},
  {id:'bio',colSpan:2,rowSpan:1,visible:true},
  {id:'handle',colSpan:1,rowSpan:1,visible:true},
  {id:'shortcuts',colSpan:1,rowSpan:2,visible:true},
];
const SettingLink=({href,title,copy}:{href:string;title:string;copy:string})=><Link className="settingsRoute" href={href}><span><strong>{title}</strong><small>{copy}</small></span><b aria-hidden="true">›</b></Link>;

export const dynamic='force-dynamic';

export default async function Page(){
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/iniciar-sesion');
  const[{data},{data:roles}]=await Promise.all([
    supabase.from('user_ui_preferences').select('theme,custom_background,module_layout').eq('user_id',user.id).maybeSingle(),
    supabase.from('admin_user_roles').select('role_id,expires_at').eq('user_id',user.id),
  ]);
  const now=Date.now();
  const activeRoles=(roles??[]).filter(row=>!row.expires_at||new Date(row.expires_at).getTime()>now).map(row=>String(row.role_id));
  const isSuperAdmin=activeRoles.includes('super_admin');
  const isAnyAdmin=activeRoles.length>0;
  const initial:UiPreferences={
    theme:typeof data?.theme==='string'?data.theme:'noche',
    custom_background:typeof data?.custom_background==='string'?data.custom_background:null,
    module_layout:Array.isArray(data?.module_layout)?data.module_layout as UiPreferences['module_layout']:defaultLayout,
  };
  return <section className="settingsCenter">
    <div className="pageHeader settingsTitleRow"><div><p className="eyebrow">Tu espacio, tus reglas</p><h1>Configuración</h1><p className="muted">Administra tu cuenta, privacidad, apariencia y la forma en que se organiza tu perfil.</p></div><Link className="ghostButton" href="/perfil">← Perfil</Link></div>

    <div className="settingsHubGrid">
      <section className="settingsSection"><header><div><h2>Cuenta y perfil</h2><p>Datos visibles, acceso, contacto y señales de confianza.</p></div></header><div className="settingsList routedSettings">
        <SettingLink href="/ajustes/cuenta" title="Acceso y recuperación" copy="Contraseña y correo privado de recuperación"/>
        <SettingLink href="/onboarding?edit=1" title="Editar perfil" copy="Nombre, bio, preferencias e intereses"/>
        <SettingLink href="/perfil/fotos" title="Fotos" copy="Sube, ordena y cambia tu foto principal"/>
        <SettingLink href="/perfil/identidad" title="Identidad y deseos" copy="Pronombres, orientación, idiomas y preferencias"/>
        <SettingLink href="/perfil/prompts" title="Preguntas del perfil" copy="Añade respuestas para mostrar más de ti"/>
        <SettingLink href="/perfil/whatsapp" title="WhatsApp" copy="Número y visibilidad de contacto"/>
      </div></section>
      <section className="settingsSection"><header><div><h2>Privacidad y seguridad</h2><p>Controla quién puede interactuar contigo y refuerza tu cuenta.</p></div></header><div className="settingsList routedSettings">
        <SettingLink href="/seguridad" title="Seguridad" copy="Bloqueos, controles de confianza y protección"/>
        <SettingLink href="/perfil/verificacion-identidad" title="Verificación" copy="Verificación opcional para aumentar confianza"/>
        <SettingLink href="/perfil/verificacion-telefono" title="Teléfono" copy="Verifica tu número cuando quieras"/>
        <SettingLink href="/citas" title="Seguridad para citas" copy="Planes y herramientas para encuentros"/>
        <SettingLink href="/blog/configuracion" title="Privacidad del contenido" copy="Audiencia, comentarios y compartidos"/>
      </div></section>
      <section className="settingsSection"><header><div><h2>Actividad y herramientas</h2><p>Notificaciones, contenido y funciones adicionales.</p></div></header><div className="settingsList routedSettings">
        <SettingLink href="/notificaciones" title="Notificaciones" copy="Revisa actividad y novedades"/>
        <SettingLink href="/guardados" title="Guardados" copy="Publicaciones que decidiste conservar"/>
        <SettingLink href="/albumes" title="Álbumes privados" copy="Gestiona contenido compartido de forma privada"/>
        <SettingLink href="/perfil/mas" title="Más ajustes" copy="Azar y herramientas secundarias"/>
      </div></section>
      {isAnyAdmin?<section className="settingsSection"><header><div><h2>Administración</h2><p>Herramientas operativas visibles solo para personal autorizado.</p></div></header><div className="settingsList routedSettings">
        <SettingLink href="/admin" title="Panel administrativo" copy={`Roles activos: ${activeRoles.join(', ')}`}/>
        <SettingLink href="/admin/photos" title="Revisión de fotos" copy="Aprobar, retener o rechazar contenido"/>
        <SettingLink href="/admin/reports" title="Reportes" copy="Investigar denuncias y aplicar medidas"/>
        {isSuperAdmin?<SettingLink href="/admin/access" title="Administradores temporales" copy="Conceder y revocar roles con caducidad"/>:null}
        {isSuperAdmin?<SettingLink href="/admin/integrations" title="Publicidad y pagos" copy="Configurar proveedores y credenciales seguras"/>:null}
        {isSuperAdmin?<SettingLink href="/admin/audit" title="Auditoría" copy="Revisar acciones administrativas"/>:null}
      </div></section>:null}
    </div>

    <SettingsClient initial={initial}/>

    <section className="settingsSection accountExitSection"><header><div><h2>Sesión</h2><p>Puedes cerrar esta sesión sin eliminar tu cuenta ni tus datos.</p></div></header><form action="/api/auth/logout" method="post"><button type="submit" className="dangerLogoutButton">Salir de esta cuenta</button></form></section>
  </section>;
}
