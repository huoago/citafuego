import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic='force-dynamic';
export default async function Page(){
 const id=await getAuthenticatedUserId();if(!id)redirect('/login');const supabase=await createClient();
 const[{data:profile},{data:photo},{data:boost}]=await Promise.all([
  supabase.from('profiles').select('display_name,district,city,verification_badge,profile_completion,bio,intent,last_active_at').eq('id',id).maybeSingle(),
  supabase.from('profile_photos').select('storage_path').eq('user_id',id).eq('status','approved').order('is_primary',{ascending:false}).order('position').limit(1).maybeSingle(),
  supabase.rpc('get_my_boost_status')
 ]);
 if(!profile)redirect('/onboarding');let imageUrl:string|null=null;if(photo?.storage_path){const{data}=await supabase.storage.from('profile-photos').createSignedUrl(photo.storage_path,600);imageUrl=data?.signedUrl??null}
 const boostStatus=(boost??{}) as {active?:boolean;endsAt?:string};
 return <section><div className="pageHeader"><p className="eyebrow">Tu presencia</p><h1>Perfil</h1></div><div className="profileSummary">{imageUrl?<span className="profileAvatar"><Image src={imageUrl} alt={profile.display_name} fill sizes="76px"/></span>:<span className="avatarPlaceholder large">{profile.display_name.slice(0,1)}</span>}<div><h2>{profile.display_name} {profile.verification_badge?<span className="verifiedBadge">✓</span>:null}</h2><p>{profile.district??profile.city} · Lima</p>{boostStatus.active?<small className="boostInline">⚡ Boost activo</small>:null}</div><span className="completionBadge">{profile.profile_completion}%</span></div>
 <div className="softPanel"><strong>Tu bio</strong><p>{profile.bio}</p></div>
 <div className="settingsList"><Link href="/onboarding?edit=1">Editar perfil y preferencias <span>›</span></Link><Link href="/perfil/fotos">Fotos y foto principal <span>›</span></Link><Link href="/perfil/prompts">Profile Prompts <span>›</span></Link><Link href="/boost">⚡ Activar Boost <span>›</span></Link><Link href="/azar">Conexión aleatoria <span>›</span></Link><Link href="/notificaciones">Notificaciones <span>›</span></Link><Link href="/seguridad">Seguridad y verificación <span>›</span></Link><Link href="/premium">Mi plan <span>›</span></Link></div></section>;
}
