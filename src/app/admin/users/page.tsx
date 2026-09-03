import Link from 'next/link';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/lib/admin/auth';
export const dynamic='force-dynamic';

type UserRow={user_id:string;display_name:string|null;email:string|null;phone_masked:string|null;status:string|null;district:string|null;created_at:string;last_sign_in_at:string|null;days_since_login:number|null;never_signed_in:boolean;inactive_90d:boolean;profile_completion:number|null;selfie_verified:boolean;identity_verified:boolean;phone_verified:boolean;reports_received:number;active_sanctions:number;deletion_requested_at:string|null;deleted_at:string|null;is_admin:boolean};

async function changeStatus(formData:FormData){'use server';
  const auth=await requireAdmin(['super_admin','trust_safety']);if(!auth)throw new Error('forbidden');
  const userId=String(formData.get('user_id')??'');const status=String(formData.get('status')??'');const reason=String(formData.get('reason')??'Cambio de estado desde backoffice');
  const {error}=await auth.admin.rpc('admin_change_account_status',{p_user:userId,p_status:status,p_reason:reason});if(error)throw new Error(error.message);revalidatePath('/admin/users');revalidatePath('/admin');
}
async function requestDeletion(formData:FormData){'use server';
  const auth=await requireAdmin(['super_admin']);if(!auth)throw new Error('forbidden');
  const userId=String(formData.get('user_id')??'');const reasonCode=String(formData.get('reason_code')??'abnormal');const note=String(formData.get('reason_note')??'').trim();const confirmed=String(formData.get('confirmed')??'')==='yes';
  if(!confirmed)throw new Error('confirmation_required');
  const presets:Record<string,string>={abnormal:'Cuenta anómala o no válida',fake:'Perfil falso o duplicado',spam:'Spam o abuso de la plataforma',user_request:'Solicitud válida del titular',other:'Otro motivo operativo'};
  const reason=`${presets[reasonCode]??presets.other}${note?`: ${note}`:''}`;
  const {error}=await auth.admin.rpc('admin_request_account_deletion',{p_user:userId,p_reason:reason,p_confirmation:'CONFIRM'});if(error)throw new Error(error.message);revalidatePath('/admin/users');revalidatePath('/admin/operations');revalidatePath('/admin');
}

function dt(value:string|null){return value?new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'Nunca';}

export default async function Users({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const auth=await requireAdmin(['super_admin','trust_safety','support','analyst','growth']);if(!auth)return null;
  const params=await searchParams;const q=typeof params.q==='string'?params.q:'';const status=typeof params.status==='string'?params.status:'';const district=typeof params.district==='string'?params.district:'';const inactiveRaw=typeof params.inactive==='string'?params.inactive:'';const inactive=inactiveRaw?Number(inactiveRaw):null;
  const {data,error}=await auth.admin.rpc('admin_get_users_v2',{p_query:q||null,p_limit:200,p_status:status||null,p_inactive_days:Number.isFinite(inactive)?inactive:null,p_district:district||null});
  const rows=(data??[]) as UserRow[];const canModerate=auth.roles.some((r)=>['super_admin','trust_safety'].includes(r));const isSuper=auth.roles.includes('super_admin');
  if(error)return <section><h2>Usuarios</h2><div className="adminNotice danger">No se pudo cargar usuarios: {error.message}</div></section>;
  return <section>
    <h2>Usuarios</h2><p>Búsqueda operacional por UUID, email, nombre o teléfono. Los teléfonos se muestran enmascarados; la inactividad usa el último inicio de sesión real de Supabase Auth.</p>
    <form className="adminFilters" method="get">
      <input name="q" defaultValue={q} placeholder="Email, UUID, nombre o teléfono"/>
      <select name="status" defaultValue={status}><option value="">Todos los estados</option><option value="active">Activo</option><option value="restricted">Restringido</option><option value="suspended">Suspendido</option><option value="banned">Bloqueado</option><option value="deletion_requested">Eliminación solicitada</option><option value="deleted">Eliminado</option></select>
      <select name="inactive" defaultValue={inactiveRaw}><option value="">Toda actividad</option><option value="30">Sin login 30 días</option><option value="60">Sin login 60 días</option><option value="90">Sin login 3 meses</option><option value="180">Sin login 6 meses</option></select>
      <input name="district" defaultValue={district} placeholder="Distrito"/>
      <button type="submit">Filtrar</button><Link href="/admin/users">Limpiar</Link>
    </form>
    {inactive===90?<div className="adminNotice warn"><b>Filtro activo:</b> usuarios sin inicio de sesión durante al menos 90 días. Esta lista es para revisión; CitaFuego no elimina automáticamente usuarios inactivos.</div>:null}
    <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Cuenta</th><th>Actividad</th><th>Estado / zona</th><th>Verificación</th><th>Riesgo operativo</th><th>Acciones</th></tr></thead><tbody>
      {rows.map((u)=><tr key={u.user_id}>
        <td><b>{u.display_name||'Sin nombre'}</b>{u.is_admin?<span className="adminBadge"> Admin</span>:null}<br/><span>{u.email||'Sin email'}</span><br/><small>{u.phone_masked||'Sin teléfono'}</small><br/><small className="adminCode">{u.user_id}</small></td>
        <td>{u.never_signed_in?<span className="adminBadge inactive">Nunca inició sesión</span>:<><b>{u.days_since_login??0}d</b> desde login</>}<br/><small>{dt(u.last_sign_in_at)}</small>{u.inactive_90d?<><br/><span className="adminBadge inactive">3+ meses inactivo</span></>:null}</td>
        <td><span className={`adminBadge ${u.status==='deleted'?'deleted':''}`}>{u.status||'unknown'}</span><br/><small>{u.district||'Sin distrito'}</small></td>
        <td><small>Perfil {u.profile_completion??0}%</small><br/><small>{u.phone_verified?'✓':'—'} teléfono · {u.selfie_verified?'✓':'—'} selfie · {u.identity_verified?'✓':'—'} identidad</small></td>
        <td><b>{u.reports_received}</b> reportes<br/><b>{u.active_sanctions}</b> sanciones activas{u.deletion_requested_at?<><br/><span className="adminBadge deleted">Eliminación solicitada</span></>:null}</td>
        <td>{u.is_admin?<div className="adminNotice">Gestionar administradores en <Link href="/admin/access">Accesos</Link>.</div>:<div className="adminActions">
          {canModerate&&u.status!=='deleted'&&u.status!=='deletion_requested'?<form action={changeStatus} className="adminActions"><input type="hidden" name="user_id" value={u.user_id}/><input type="hidden" name="reason" value="Operación manual desde /admin/users"/><select name="status" defaultValue={u.status||'active'}><option value="active">Activar</option><option value="restricted">Restringir</option><option value="suspended">Suspender</option><option value="banned">Bloqueo permanente</option></select><button type="submit">Aplicar</button></form>:null}
          {isSuper&&u.status!=='deleted'&&u.status!=='deletion_requested'?<details><summary className="adminButton danger">Solicitar eliminación</summary><form action={requestDeletion} className="adminPanel adminDangerZone"><input type="hidden" name="user_id" value={u.user_id}/><div className="adminField"><label>Motivo</label><select name="reason_code" defaultValue="abnormal"><option value="abnormal">Cuenta anómala o no válida</option><option value="fake">Perfil falso o duplicado</option><option value="spam">Spam o abuso</option><option value="user_request">Solicitud del titular</option><option value="other">Otro motivo</option></select></div><div className="adminField"><label>Nota opcional</label><textarea name="reason_note" placeholder="Añade contexto solo si hace falta"/></div><label className="adminDeleteConfirm"><input type="checkbox" name="confirmed" value="yes" required/><span>Confirmo que quiero crear la solicitud de eliminación.</span></label><button className="adminButton danger" type="submit">Crear solicitud</button></form></details>:null}
        </div>}</td>
      </tr>)}
      {!rows.length?<tr><td colSpan={6} className="adminEmpty">No hay usuarios con estos filtros.</td></tr>:null}
    </tbody></table></div>
  </section>;
}
