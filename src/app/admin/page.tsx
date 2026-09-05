import Link from 'next/link';
import {ALL_ADMIN_ROLES,requireAdmin} from '@/lib/admin/auth';
export const dynamic='force-dynamic';
type Metrics={inactivePolicyDays?:number;users?:Record<string,number>;quality?:Record<string,number>;safety?:Record<string,number>;engagement?:Record<string,number>;deletionJobs?:Record<string,number>};
type Funnel={realAccounts?:number;privateStarted?:number;legalConsented?:number;profilesCreated?:number;activeProfiles?:number;profiles80Plus?:number;usersWithApprovedPhotos?:number};
const value=(obj:Record<string,number>|undefined,key:string)=>Number(obj?.[key]??0).toLocaleString('es-PE');
const n=(obj:Record<string,number>|undefined,key:string)=>Number(obj?.[key]??0);
const funnelValue=(f:Funnel,key:keyof Funnel)=>Number(f[key]??0);
const pct=(part:number,total:number)=>total>0?Math.round(part/total*100):0;
export default async function AdminHome(){
 const auth=await requireAdmin(ALL_ADMIN_ROLES);if(!auth)return null;
 const[{data,error},{data:funnelData,error:funnelError}]=await Promise.all([
   auth.admin.rpc('admin_get_dashboard_v2'),
   auth.admin.rpc('admin_get_lifecycle_funnel'),
 ]);
 const m=(data??{}) as Metrics;const f=(funnelData??{}) as Funnel;
 if(error)return <section><h2>Dashboard</h2><div className="adminNotice danger">No se pudieron cargar las métricas operativas: {error.message}</div></section>;
 const total=Math.max(1,n(m.users,'total'));const active7=n(m.users,'active7d');const complete=n(m.quality,'profileComplete');const openRisk=n(m.safety,'openReports')+n(m.safety,'pendingAppeals')+n(m.safety,'activeSanctions');
 const realAccounts=funnelValue(f,'realAccounts');const privateStarted=funnelValue(f,'privateStarted');const legalConsented=funnelValue(f,'legalConsented');const profilesCreated=funnelValue(f,'profilesCreated');const activeProfiles=funnelValue(f,'activeProfiles');const profiles80Plus=funnelValue(f,'profiles80Plus');const approvedPhotoUsers=funnelValue(f,'usersWithApprovedPhotos');
 return <section className="adminCommandCenter">
   <div className="adminCommandHero"><div><p className="eyebrow">CitaFuego · Centro de mando</p><h2>Operación en tiempo real</h2><p>Usuarios, seguridad, crecimiento y estabilidad en una sola vista. Los chats privados nunca se cargan aquí.</p></div><div className="adminCommandPulse"><span/><b>SISTEMA EN LÍNEA</b><small>Producción · Lima</small></div></div>
   <div className="adminCommandGrid">
    <article className="adminTechMetric"><span className="adminTechIcon">◉</span><small>Usuarios reales</small><strong>{value(m.users,'total')}</strong><em>base operativa</em></article>
    <article className="adminTechMetric"><span className="adminTechIcon">↗</span><small>Activos · 7 días</small><strong>{value(m.users,'active7d')}</strong><em>{Math.round(active7/total*100)}% de la base</em></article>
    <article className="adminTechMetric"><span className="adminTechIcon">✓</span><small>Perfil ≥80%</small><strong>{value(m.quality,'profileComplete')}</strong><em>{Math.round(complete/total*100)}% calidad</em></article>
    <article className={`adminTechMetric ${openRisk?'attention':''}`}><span className="adminTechIcon">△</span><small>Señales de riesgo</small><strong>{openRisk}</strong><em>reportes + apelaciones + sanciones</em></article>
   </div>
   <div className="adminTechTelemetry"><div><span>Actividad</span><i style={{width:`${Math.min(100,Math.max(4,active7/total*100))}%`}}/><b>{value(m.users,'active7d')} activos 7d</b></div><div><span>Calidad</span><i style={{width:`${Math.min(100,Math.max(4,complete/total*100))}%`}}/><b>{value(m.quality,'profileComplete')} perfiles completos</b></div><div><span>Seguridad</span><i className={openRisk?'warn':''} style={{width:`${Math.min(100,Math.max(4,100-Math.min(95,openRisk*8)))}%`}}/><b>{openRisk?'Revisión requerida':'Sin alertas abiertas'}</b></div></div>
   {funnelError?<div className="adminNotice warn">El embudo de activación no está disponible: {funnelError.message}</div>:<div className="adminPanel adminTechPanel">
     <h3>Embudo real · registro → confianza</h3>
     <p>Excluye cuentas administrativas. El consentimiento legal exige Términos + Privacidad + Datos sensibles; las fotos cuentan solo cuando están aprobadas.</p>
     <div className="adminSignalList">
       <span>1 · Cuentas reales <b>{realAccounts.toLocaleString('es-PE')}</b></span>
       <span>2 · Datos privados iniciados <b>{privateStarted.toLocaleString('es-PE')} · {pct(privateStarted,realAccounts)}%</b></span>
       <span>3 · Consentimiento legal completo <b>{legalConsented.toLocaleString('es-PE')} · {pct(legalConsented,realAccounts)}%</b></span>
       <span>4 · Perfil creado <b>{profilesCreated.toLocaleString('es-PE')} · {pct(profilesCreated,realAccounts)}%</b></span>
       <span>5 · Perfil activo <b>{activeProfiles.toLocaleString('es-PE')} · {pct(activeProfiles,realAccounts)}%</b></span>
       <span>6 · Perfil ≥80% <b>{profiles80Plus.toLocaleString('es-PE')} · {pct(profiles80Plus,realAccounts)}%</b></span>
       <span>7 · Foto aprobada <b>{approvedPhotoUsers.toLocaleString('es-PE')} · {pct(approvedPhotoUsers,realAccounts)}%</b></span>
     </div>
   </div>}
   <div className="adminMetricGrid adminMetricGridCompact"><div className="adminMetric"><small>Nuevos · 24 h</small><strong>{value(m.users,'new24h')}</strong></div><div className="adminMetric"><small>Nuevos · 7 días</small><strong>{value(m.users,'new7d')}</strong></div><div className="adminMetric"><small>Nuevos · 30 días</small><strong>{value(m.users,'new30d')}</strong></div><div className="adminMetric"><Link href="/admin/users?inactive=90"><small>3 meses sin iniciar sesión</small><strong>{value(m.users,'inactive90d')}</strong></Link></div></div>
   <div className="adminSplit"><div className="adminPanel adminTechPanel"><h3>Ciclo de vida de cuentas</h3><div className="adminSignalList"><span>Nunca iniciaron sesión <b>{value(m.users,'neverSignedIn')}</b></span><span>Inactivos · política {m.inactivePolicyDays??90}d <b>{value(m.users,'inactivePolicy')}</b></span><span>Eliminación solicitada <b>{value(m.users,'deletionRequested')}</b></span><span>Eliminados <b>{value(m.users,'deleted')}</b></span></div><div className="adminActions"><Link href="/admin/users?inactive=90">Revisar inactivos</Link>{auth.roles.includes('super_admin')?<Link href="/admin/operations">Configuración y eliminación</Link>:null}</div></div><div className="adminPanel adminTechPanel"><h3>Confianza y seguridad</h3><div className="adminSignalList"><span>Fotos pendientes <b>{value(m.safety,'pendingPhotos')}</b></span><span>Reportes abiertos <b>{value(m.safety,'openReports')}</b></span><span>Apelaciones pendientes <b>{value(m.safety,'pendingAppeals')}</b></span><span>Sanciones activas <b>{value(m.safety,'activeSanctions')}</b></span></div></div></div>
   <div className="adminSplit"><div className="adminPanel adminTechPanel"><h3>Calidad de usuario</h3><p>Perfil ≥80%: <b>{value(m.quality,'profileComplete')}</b> · Selfie: <b>{value(m.quality,'selfieVerified')}</b> · Identidad: <b>{value(m.quality,'identityVerified')}</b> · Teléfono: <b>{value(m.quality,'phoneVerified')}</b></p></div><div className="adminPanel adminTechPanel"><h3>Engagement · 7 días</h3><p>Likes: <b>{value(m.engagement,'likes7d')}</b> · Matches: <b>{value(m.engagement,'matches7d')}</b> · Mensajes: <b>{value(m.engagement,'messages7d')}</b></p></div></div>
   {auth.roles.includes('super_admin')?<div className="adminPanel adminDangerZone"><h3>Cola de eliminación</h3><p>Pendientes: <b>{value(m.deletionJobs,'pending')}</b> · Listos para finalizar: <b>{value(m.deletionJobs,'due')}</b>. La inactividad nunca elimina cuentas automáticamente.</p><Link className="adminButton danger" href="/admin/operations">Abrir zona de operaciones</Link></div>:null}
 </section>;
}
