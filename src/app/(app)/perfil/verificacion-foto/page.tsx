import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAuthenticatedUserId} from '@/lib/auth/server';
import {createClient} from '@/lib/supabase/server';
import {RealPhotoVerification} from '@/components/verification/real-photo-verification';

export const dynamic='force-dynamic';

export default async function Page(){
  const userId=await getAuthenticatedUserId();
  if(!userId)redirect('/iniciar-sesion');
  const supabase=await createClient();
  const[{data:profile},{count:approvedPhotos}]=await Promise.all([
    supabase.from('profiles').select('verification_badge').eq('id',userId).maybeSingle(),
    supabase.from('profile_photos').select('id',{count:'exact',head:true}).eq('user_id',userId).eq('status','approved'),
  ]);
  const verified=Boolean(profile?.verification_badge);
  return <section>
    <div className="pageHeader"><p className="eyebrow">Confianza privada</p><h1>Verificación de foto real</h1><p className="muted">CitaFuego ya no solicita DNI, pasaporte ni otro documento de identidad para verificar una cuenta. La única verificación de persona real es una selfie privada revisada por el equipo autorizado.</p></div>
    <div className="softPanel">
      <h2>Tu selfie de verificación no es una foto de perfil</h2>
      <p>Se guarda en almacenamiento privado separado y solo se muestra temporalmente en el panel interno de Trust &amp; Safety para compararla con una foto de perfil aprobada. No se publica en tu perfil, no entra en Fotos, no entra en Álbumes privados, Stories ni Blog, y no se comparte con otros usuarios.</p>
      <div className="safetyRow"><span><strong>Estado</strong><small>Revisión manual de foto real</small></span><span className="completionBadge">{verified?'✓ Verificada':'Pendiente / opcional'}</span></div>
    </div>
    {verified?<div className="softPanel"><h2>Foto real verificada</h2><p>Tu cuenta ya tiene la señal de foto real verificada. La evidencia de selfie no se usa como contenido social.</p></div>:<RealPhotoVerification hasApprovedPhoto={(approvedPhotos??0)>0}/>} 
    <div className="heroActions"><Link className="ghostButton" href="/perfil/fotos">Gestionar fotos de perfil</Link><Link className="ghostButton" href="/perfil">Volver al perfil</Link></div>
  </section>;
}
