import {requireAdmin} from '@/lib/admin/auth';
import {AdminAccessClient} from '@/components/admin/admin-access-client';

export const dynamic='force-dynamic';
export default async function Page(){
 const a=await requireAdmin(['super_admin']);if(!a)return null;
 const[{data:assignments},{data:candidates}]=await Promise.all([
  a.admin.rpc('admin_list_role_assignments'),
  a.admin.rpc('admin_search_role_candidates',{p_query:'',p_limit:50}),
 ]);
 return <section><div className="adminSectionHeader"><div><p className="eyebrow">Control de acceso</p><h2>Administradores temporales</h2><p className="muted">Concede funciones concretas con fecha de caducidad. Las cuentas Super Admin permanentes no se gestionan aquí.</p></div></div><AdminAccessClient assignments={(assignments??[]) as never[]} candidates={(candidates??[]) as never[]}/></section>;
}
