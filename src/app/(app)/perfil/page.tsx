import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { CSSProperties,ReactNode } from 'react';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getSocialProfile } from '@/lib/social/server';
import { HandleForm } from '@/components/social/handle-form';
import { TrustMark } from '@/components/profile/trust-mark';

export const dynamic='force-dynamic';
const SettingLink=({href,children}:{href:string;children:React.ReactNode})=><Link href={href}>{children}<span aria-hidden="true">›</span></Link>;
type ModuleId='completion'|'social'|'bio'|'handle'|'shortcuts';
type ModuleConfig={id:ModuleId;colSpan:1|2;rowSpan:1|2;visible:boolean};
const defaults:ModuleConfig[]=[
  {id:'completion',colSpan:2,rowSpan:1,visible:true},
  {id:'social',colSpan:2,rowSpan:1,visible:true},
  {id:'bio',colSpan:2,rowSpan:1,visible:true},
  {id:'handle',colSpan:1,rowSpan:1,visible:true},
  {id:'shortcuts',colSpan:1,rowSpan:2,visible:true},
];
const allowed=new Set<ModuleId>(defaults.map(x=>x.id));
function normalizeLayout(value:unknown):ModuleConfig[]{
  const result:ModuleConfig[]=[];const seen=new Set<ModuleId>();
  if(Array.isArray(value))for(const raw of value){
    const id=(raw as {id?:unknown})?.id;
    if(typeof id!=='string'||!allowed.has(id as ModuleId)||seen.has(id as ModuleId))continue;
    seen.add(id as ModuleId);
    result.push({id:id as ModuleId,colSpan:(raw as {colSpan?:unknown}).colSpan===2?2:1,rowSpan:(raw as {rowSpan?:unknown}).rowSpan===2?2:1,visible:(raw as {visible?:unknown}).visible!==false});
  }
  for(const row of defaults)if(!seen.has(row.id))result.push(row);
  return result;
}
function Module({config,children}:{config:ModuleConfig;children:ReactNode}){
  const style:CSSProperties={order:0,gridColumn:`span ${config.colSpan}`,gridRow:`span ${config.rowSpan}`};
  return <div className={`profilePersonalModule ${config.visible?'':'moduleHidden'}`} style={style}>{children}</div>;
}

export default async function Page(){
  const id=await getAuthenticatedUserId();if(!id)redirect('/iniciar-sesion');
  const supabase=await createClient();
  const[{data:profile},{data:photo},{data:boost},{data:prefs},social]=await Promise.all([
    supabase.from('profiles').select('display_name,district,city,verification_badge,profile_completion,bio,intent,last_active_at').eq('id',id).maybeSingle(),
    supabase.from('profile_photos').select('storage_path').eq('user_id',id).eq('status','approved').order('is_primary',{ascending:false}).order('position').limit(1).maybeSingle(),
    supabase.rpc('get_my_boost_status'),
    supabase.from('user_ui_preferences').select('module_layout').eq('user_id',id).maybeSingle(),
    getSocialProfile(id),
  ]);
  if(!profile)redirect('/onboarding');
  let imageUrl:string|null=null;
  if(photo?.storage_path){const{data}=await supabase.storage.from('profile-photos').createSignedUrl(photo.storage_path,600);imageUrl=data?.signedUrl??null}
  const hasPhoto=Boolean(imageUrl);
  const verified=Boolean(profile.verification_badge);
  const trustLabel=hasPhoto&&verified?'Foto real verificada':verified?'Foto real verificada':hasPhoto?'Fotos aprobadas':'Perfil estándar';
  const boostStatus=(boost??{}) as {active?:boolean};
  const layout=normalizeLayout(prefs?.module_layout);
  const modules:Record<ModuleId,ReactNode>={
    completion:profile.profile_completion<100?<div className="profileCompletionPrompt"><div><strong>Tu perfil está al {profile.profile_completion}%</strong><span>Completarlo mejora la calidad de las recomendaciones, pero puedes usar Descubrir sin terminarlo.</span></div><Link className="ghostButton" href="/onboarding?edit=1">Completar perfil</Link></div>:<div className="softPanel"><strong>Perfil completo</strong><p>Tus datos principales están completos. Puedes modificarlos cuando quieras.</p></div>,
    social:social?<div className="socialStats"><Link href={`/perfil/${id}/seguidores`}><strong>{social.followers}</strong><span>Seguidores</span></Link><Link href={`/perfil/${id}/seguidos`}><strong>{social.following}</strong><span>Siguiendo</span></Link><Link href="/stories"><strong>{social.activeStories}</strong><span>Stories</span></Link></div>:<div className="softPanel"><strong>Actividad social</strong><p>Tu actividad aparecerá aquí.</p></div>,
    bio:<div className="softPanel"><strong>Tu bio</strong><p>{profile.bio||'Puedes añadir una bio cuando quieras.'}</p></div>,
    handle:social?<HandleForm initial={social.handle}/>:<div className="softPanel"><strong>Nombre de usuario</strong><p>Disponible cuando completes tus datos básicos.</p></div>,
    shortcuts:<div className="profileSettingsGroups">
      <section className="settingsSection"><header><div><h2>Mi perfil</h2><p>Lo que otras personas ven y cómo quieres conectar.</p></div></header><div className="settingsList"><SettingLink href="/onboarding?edit=1">Editar perfil y preferencias</SettingLink><SettingLink href="/perfil/identidad">Identidad y deseos</SettingLink><SettingLink href="/perfil/fotos">Fotos y foto principal</SettingLink><SettingLink href="/perfil/prompts">Preguntas de perfil</SettingLink><SettingLink href="/perfil/whatsapp">WhatsApp · número y visibilidad</SettingLink></div></section>
      <section className="settingsSection"><header><div><h2>Contenido y social</h2><p>Tu actividad, publicaciones y contenido privado.</p></div></header><div className="settingsList"><SettingLink href="/stories">Stories de 24 horas</SettingLink><SettingLink href="/stories/nuevo">Crear Story</SettingLink><SettingLink href="/blog/mio">Mi blog</SettingLink><SettingLink href="/guardados">Publicaciones guardadas</SettingLink><SettingLink href="/albumes">Álbumes privados</SettingLink></div></section>
      <section className="settingsSection"><header><div><h2>Seguridad y privacidad</h2><p>La verificación de foto real es opcional y añade una señal de confianza. La selfie se revisa de forma privada y nunca entra en tus álbumes.</p></div></header><div className="settingsList"><SettingLink href="/perfil/verificacion-foto">✓ Verificación de foto real</SettingLink><SettingLink href="/perfil/verificacion-telefono">☎ Verificación de teléfono</SettingLink><SettingLink href="/citas">⌖ Seguridad para citas</SettingLink><SettingLink href="/blog/configuracion">Privacidad del blog</SettingLink><SettingLink href="/notificaciones">Notificaciones</SettingLink><SettingLink href="/seguridad">Seguridad y verificación</SettingLink></div></section>
      <div className="settingsList profileMoreLink"><SettingLink href="/perfil/mas">Más ajustes y herramientas</SettingLink></div>
    </div>,
  };

  return <section>
    <div className="profileHeaderActions"><div className="pageHeader"><p className="eyebrow">Tu presencia</p><h1>Perfil</h1></div><Link className="ghostButton profileSettingsButton" href="/ajustes"><span aria-hidden="true">⚙</span> Configuración</Link></div>
    <div className="profileSummary">
      <span className="profileAvatarWrap">
        {imageUrl?<span className="profileAvatar"><Image src={imageUrl} alt={profile.display_name} fill sizes="76px"/></span>:<span className="avatarPlaceholder large">{profile.display_name.slice(0,1)}</span>}
        <TrustMark hasPhoto={hasPhoto} verified={verified} className="avatarTrustMark"/>
      </span>
      <div><h2>{profile.display_name}</h2><p>{profile.district??profile.city} · Lima</p><small className="trustCaption">{trustLabel}</small>{social?.handle?<small>@{social.handle}</small>:null}{boostStatus.active?<small className="boostInline">⚡ Boost activo</small>:null}</div>
      <Link className="completionBadge completionAction" href="/onboarding?edit=1" aria-label={`Perfil completado al ${profile.profile_completion} por ciento`}>{profile.profile_completion}%</Link>
    </div>
    <p className="profileLayoutHint">Puedes reorganizar, cambiar de tamaño u ocultar los módulos desde <Link href="/ajustes">Configuración</Link>.</p>
    <div className="profilePersonalGrid">{layout.map((config,index)=><Module key={config.id} config={{...config}}><div style={{height:'100%',order:index}}>{modules[config.id]}</div></Module>)}</div>
  </section>;
}
