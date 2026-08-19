import {requireAdmin} from '@/lib/admin/auth';
import {ProviderIntegrationsClient} from '@/components/admin/provider-integrations-client';

export const dynamic='force-dynamic';
export default async function Page(){
 const a=await requireAdmin(['super_admin']);if(!a)return null;
 const{data,error}=await a.admin.rpc('admin_get_provider_config_status');
 return <section><div className="adminSectionHeader"><div><p className="eyebrow">Integraciones sensibles</p><h2>Publicidad y pagos</h2><p className="muted">Gestiona ExoClick, SegPay y futuros proveedores. Las credenciales se almacenan en Vault y nunca se vuelven a mostrar.</p></div></div>{error?<div className="softPanel"><strong>No se pudo cargar la configuración</strong><p>{error.message}</p></div>:<ProviderIntegrationsClient providers={(data??[]) as never[]}/>}</section>;
}
