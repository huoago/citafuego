import Image from 'next/image';
import Link from 'next/link';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { getRecommendationHub } from '@/lib/recommendations/server';
import { BlogCard } from '@/components/blog/blog-card';
import { StoryCard } from '@/components/stories/story-card';
import { FollowButton } from '@/components/social/follow-button';

export const dynamic='force-dynamic';

export default async function Page(){
 const userId=await getAuthenticatedUserId();if(!userId)return null;
 const{feed,follows,matches}=await getRecommendationHub();
 return <section className="forYouPage">
  <div className="pageHeader forYouHeader"><div><p className="eyebrow">Tu red se vuelve más inteligente</p><h1>Para ti</h1><p className="muted">CitaFuego combina lo que sigues, miras, guardas, comentas y las conexiones que realmente mantienes para mostrarte personas y contenido más relevante.</p></div><Link href="/descubrir" className="ghostButton">Ajustar preferencias</Link></div>

  {feed.length?<div className="forYouFeed">{feed.map((item)=>{
   if(item.type==='blog'&&item.blog)return <div className="recommendedBlock" key={`blog-${item.id}`}><div className="recommendationReason"><span>Para ti · Blog</span><small>{item.reason}</small></div><BlogCard post={item.blog} currentUserId={userId}/></div>;
   if(item.type==='story'&&item.story)return <div className="recommendedBlock" key={`story-${item.id}`}><div className="recommendationReason"><span>Para ti · Story</span><small>{item.reason}</small></div><StoryCard story={item.story} currentUserId={userId}/></div>;
   if(item.type==='profile'&&item.profile){const p=item.profile.profile;const photo=item.profile.photos.find(x=>x.primary)?.url??item.profile.photos[0]?.url??null;return <article className="recommendedProfileCard" key={`profile-${item.id}`}><div className="recommendationReason"><span>Persona recomendada</span><small>{item.reason}</small></div><Link href={`/perfil/${p.id}`} className="recommendedProfileMain">{photo?<span className="recommendedAvatar"><Image src={photo} alt={p.displayName} fill sizes="88px" unoptimized/></span>:<span className="avatarPlaceholder large">{p.displayName.slice(0,1)}</span>}<div><h2>{p.displayName} {p.verified?<span className="verifiedBadge">✓</span>:null}</h2>{item.profile.handle?<p>@{item.profile.handle}</p>:null}<small>{p.district??p.city}{p.occupation?` · ${p.occupation}`:''}</small></div></Link><div className="recommendedProfileActions"><FollowButton targetId={p.id} initialFollowing={item.profile.viewerFollows} initialFollowers={item.profile.followers}/><Link className="ghostButton" href={`/perfil/${p.id}`}>Ver perfil</Link></div></article>}
   return null;
  })}</div>:<div className="emptyState"><h2>Tu feed está aprendiendo</h2><p>Explora perfiles, mira Stories, guarda blogs y conversa con tus Matches. El feed se personaliza con esas señales.</p><Link className="primaryButton" href="/descubrir">Empezar a descubrir</Link></div>}

  <section className="recommendationSection"><div className="sectionTitle"><div><p className="eyebrow">Amplía tu círculo</p><h2>A quién seguir</h2></div><Link href="/blog">Explorar contenido</Link></div>{follows.length?<div className="recommendationPeopleGrid">{follows.map((person)=><article key={person.profileId}><Link href={`/perfil/${person.profileId}`} className="recommendationPersonLink">{person.photoUrl?<span className="recommendationThumb"><Image src={person.photoUrl} alt={person.displayName} fill sizes="72px" unoptimized/></span>:<span className="avatarPlaceholder">{person.displayName.slice(0,1)}</span>}<div><strong>{person.displayName} {person.verified?'✓':''}</strong><small>{person.district??'Lima'}</small><p>{person.reason}</p></div></Link><FollowButton targetId={person.profileId} showCount={false}/></article>)}</div>:<p className="muted">Aún no hay recomendaciones suficientes.</p>}</section>

  <section className="recommendationSection"><div className="sectionTitle"><div><p className="eyebrow">Compatibilidad + afinidad social</p><h2>Matches potenciales</h2></div><Link href="/descubrir">Ver Discovery</Link></div>{matches.length?<div className="potentialMatchGrid">{matches.map((person)=><Link href={`/perfil/${person.profileId}`} key={person.profileId} className="potentialMatchCard">{person.photoUrl?<div className="potentialMatchPhoto"><Image src={person.photoUrl} alt={person.displayName} fill sizes="(max-width:680px) 45vw, 220px" unoptimized/></div>:<div className="potentialMatchPhoto placeholder"><span>{person.displayName.slice(0,1)}</span></div>}<div className="potentialMatchCopy"><strong>{person.displayName}, {person.age} {person.verified?'✓':''}</strong><small>{person.district??'Lima'} · {person.distanceBucket}</small><p>{person.reason}</p><div><span>🔥 {person.chemistryScore}% química</span>{person.sharedInterestCount>0?<span>{person.sharedInterestCount} intereses</span>:null}</div></div></Link>)}</div>:<p className="muted">Cuando haya más señales de compatibilidad, aparecerán aquí.</p>}</section>
 </section>;
}
