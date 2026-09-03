import {requireAdmin} from '@/lib/admin/auth';
import {ProviderIntegrationsClient} from '@/components/admin/provider-integrations-client';

export const dynamic='force-dynamic';
export default async function Page(){
 const a=await requireAdmin(['super_admin']);if(!a)return null;
 const{data,error}=await a.admin.rpc('admin_get_provider_config_status');
 return <section><div className="adminSectionHeader"><div><p className="eyebrow">Integraciones sensibles</p><h2>Integraciones</h2><p className="muted">Gestiona Google OAuth, ExoClick, Segpay y futuros proveedores. Los secretos se guardan cifrados en Supabase Vault y nunca se vuelven a mostrar después de guardarlos.</p></div></div><div className="adminNotice">Para Google Login configura <b>GOOGLE_CLIENT_ID</b> y <b>GOOGLE_CLIENT_SECRET</b>, usa <code>https://citafuego.com/auth/callback</code> como Redirect URI y después habilita el proveedor Google en Supabase Auth.</div>{error?<div className="softPanel"><strong>No se pudo cargar la configuración</strong><p>{error.message}</p></div>:<ProviderIntegrationsClient providers={(data??[]) as never[]}/>}</section>;
}
