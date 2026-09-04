import type {ReactNode} from 'react';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {AdminNav} from '@/components/admin/admin-nav';
import {AdminLanguageSwitch} from '@/components/admin/admin-language-switch';
import {AdminFormMode} from '@/components/admin/admin-form-mode';
import {AdminContextControls} from '@/components/admin/admin-context-controls';
import {ALL_ADMIN_ROLES,getAdminAccess} from '@/lib/admin/auth';
import '../interaction.css';
import '../growth.css';
import '../blog.css';
import '../recommendations.css';
import '../monetization.css';
import '../top-tier.css';
import '../ios-social.css';
import '../ios-v2.css';
import '../chat-read-v7.css';
import '../whatsapp-contact.css';
import '../v20-settings-personalization.css';
import './admin-backoffice.css';
import './admin-v3.css';
import './admin-logo.css';

export const dynamic='force-dynamic';

export default async function AdminLayout({children}:{children:ReactNode}){
  const access=await getAdminAccess(ALL_ADMIN_ROLES);
  if(access.state==='unauthenticated')redirect('/iniciar-sesion?next=/admin');
  if(access.state==='forbidden')return <main className="adminDenied">
    <div className="adminDeniedCard">
      <p className="adminEyebrow">CitaFuego · Backoffice</p>
      <h1>403 · Acceso denegado</h1>
      <p>Tu cuenta está autenticada, pero no tiene un rol administrativo activo. No se ha cargado ningún dato del backoffice.</p>
      <div className="adminActions"><Link href="/">Volver a CitaFuego</Link><Link href="/logout">Cerrar sesión</Link></div>
    </div>
  </main>;
  const superAdmin=access.roles.includes('super_admin');
  return <main className="adminLayout" data-admin-i18n-root>
    <header className="adminHeader">
      <div><p className="adminEyebrow">CitaFuego · Backoffice de producción</p><h1>Administración</h1><small>Roles activos: {access.roles.join(', ')}</small></div>
      <div className="adminHeaderTools">
        <AdminLanguageSwitch/>
        <AdminFormMode/>
        <div className="adminHeaderBadges"><span className="adminStatus ok">Producción</span>{superAdmin?<span className="adminStatus super">Super Admin</span>:null}</div>
      </div>
    </header>
    <div className="adminWorkspace">
      <AdminNav roles={access.roles}/>
      <div className="adminContent"><AdminContextControls isSuperAdmin={superAdmin}/>{children}</div>
    </div>
  </main>;
}
