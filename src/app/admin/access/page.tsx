import {requireAdmin} from '@/lib/admin/auth';
import {AdminAccessClient} from '@/components/admin/admin-access-client';
import {SuperAdminControls} from '@/components/admin/super-admin-controls';

export const dynamic='force-dynamic';
export default async function Page(){
 const a=await requireAdmin(['super_admin']);if(!a)return null;
 const[{data:assignments},{data:candidates}]=await Promise.all([
  a.admin.rpc('admin_list_role_assignments'),
  a.admin.rpc('admin_search_role_candidates',{p_query:'',p_limit:50}),
 ]);
 return <section><h2>Accesos y administradores</h2><p>Los roles operativos son temporales. La rotación de Super Admin permanente usa un flujo independiente con confirmaciones, protección contra auto-borrado y mínimo de un Super Admin activo.</p><div className="adminNotice warn"><b>Secuencia obligatoria:</b> crear cuenta Auth → promover y verificar nuevo Super Admin → probar /admin → recién después deshabilitar administradores anteriores.</div><SuperAdminControls currentUserId={a.userId} assignments={(assignments??[]) as never[]} candidates={(candidates??[]) as never[]}/><AdminAccessClient assignments={(assignments??[]) as never[]} candidates={(candidates??[]) as never[]}/></section>;
}
