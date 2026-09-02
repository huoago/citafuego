import Link from 'next/link';
import {ALL_ADMIN_ROLES,requireAdmin} from '@/lib/admin/auth';
export const dynamic='force-dynamic';

type Metrics={
  inactivePolicyDays?:number;
  users?:Record<string,number>;
  quality?:Record<string,number>;
  safety?:Record<string,number>;
  engagement?:Record<string,number>;
  deletionJobs?:Record<string,number>;
};
const value=(obj:Record<string,number>|undefined,key:string)=>Number(obj?.[key]??0).toLocaleString('es-PE');

export default async function AdminHome(){
  const auth=await requireAdmin(ALL_ADMIN_ROLES);if(!auth)return null;
  const {data,error}=await auth.admin.rpc('admin_get_dashboard_v2');
  const m=(data??{}) as Metrics;
  if(error)return <section><h2>Dashboard</h2><div className="adminNotice danger">No se pudieron cargar las métricas operativas: {error.message}</div></section>;
  return <section>
    <h2>Dashboard operativo</h2>
    <p>Vista de producción para crecimiento, confianza y seguridad, cuentas y salud operativa. Los chats privados no se exponen en este panel.</p>

    <div className="adminMetricGrid">
      <div className="adminMetric"><small>Usuarios reales</small><strong>{value(m.users,'total')}</strong></div>
      <div className="adminMetric"><small>Nuevos · 24 h</small><strong>{value(m.users,'new24h')}</strong></div>
      <div className="adminMetric"><small>Nuevos · 7 días</small><strong>{value(m.users,'new7d')}</strong></div>
      <div className="adminMetric"><small>Nuevos · 30 días</small><strong>{value(m.users,'new30d')}</strong></div>
      <div className="adminMetric"><small>Activos · 24 h</small><strong>{value(m.users,'active24h')}</strong></div>
      <div className="adminMetric"><small>Activos · 7 días</small><strong>{value(m.users,'active7d')}</strong></div>
      <div className="adminMetric"><small>Activos · 30 días</small><strong>{value(m.users,'active30d')}</strong></div>
      <div className="adminMetric"><Link href="/admin/users?inactive=90"><small>3 meses sin iniciar sesión</small><strong>{value(m.users,'inactive90d')}</strong></Link></div>
    </div>

    <div className="adminSplit">
      <div className="adminPanel"><h3>Ciclo de vida de cuentas</h3>
        <div className="adminMetricGrid">
          <div className="adminMetric"><small>Nunca iniciaron sesión</small><strong>{value(m.users,'neverSignedIn')}</strong></div>
          <div className="adminMetric"><small>Inactivos · política {m.inactivePolicyDays??90}d</small><strong>{value(m.users,'inactivePolicy')}</strong></div>
          <div className="adminMetric"><small>Eliminación solicitada</small><strong>{value(m.users,'deletionRequested')}</strong></div>
          <div className="adminMetric"><small>Eliminados</small><strong>{value(m.users,'deleted')}</strong></div>
        </div>
        <div className="adminActions"><Link href="/admin/users?inactive=90">Revisar inactivos</Link>{auth.roles.includes('super_admin')?<Link href="/admin/operations">Configuración y eliminación</Link>:null}</div>
      </div>
      <div className="adminPanel"><h3>Seguridad</h3>
        <div className="adminMetricGrid">
          <div className="adminMetric"><small>Fotos pendientes</small><strong>{value(m.safety,'pendingPhotos')}</strong></div>
          <div className="adminMetric"><small>Reportes abiertos</small><strong>{value(m.safety,'openReports')}</strong></div>
          <div className="adminMetric"><small>Apelaciones pendientes</small><strong>{value(m.safety,'pendingAppeals')}</strong></div>
          <div className="adminMetric"><small>Sanciones activas</small><strong>{value(m.safety,'activeSanctions')}</strong></div>
        </div>
      </div>
    </div>

    <div className="adminSplit">
      <div className="adminPanel"><h3>Calidad de usuario</h3><p>Perfil ≥80%: <b>{value(m.quality,'profileComplete')}</b> · Selfie: <b>{value(m.quality,'selfieVerified')}</b> · Identidad: <b>{value(m.quality,'identityVerified')}</b> · Teléfono: <b>{value(m.quality,'phoneVerified')}</b></p></div>
      <div className="adminPanel"><h3>Engagement · 7 días</h3><p>Likes: <b>{value(m.engagement,'likes7d')}</b> · Matches: <b>{value(m.engagement,'matches7d')}</b> · Mensajes: <b>{value(m.engagement,'messages7d')}</b></p></div>
    </div>

    {auth.roles.includes('super_admin')?<div className="adminPanel adminDangerZone"><h3>Cola de eliminación</h3><p>Pendientes: <b>{value(m.deletionJobs,'pending')}</b> · Vencidos/listos para finalizar: <b>{value(m.deletionJobs,'due')}</b>. La eliminación automática por inactividad permanece desactivada.</p><Link className="adminButton danger" href="/admin/operations">Abrir zona de operaciones</Link></div>:null}
  </section>;
}
