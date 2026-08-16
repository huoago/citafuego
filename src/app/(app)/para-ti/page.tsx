import Image from 'next/image';
import Link from 'next/link';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { getRecommendationHub } from '@/lib/recommendations/server';
import { getAdForPlacement } from '@/lib/monetization/server';
import { BlogCard } from '@/components/blog/blog-card';
import { StoryCard } from '@/components/stories/story-card';
import { FollowButton } from '@/components/social/follow-button';
import { RecommendationFrame } from '@/components/recommendations/recommendation-frame';
import { AdCard } from '@/components/ads/ad-card';

export const dynamic='force-dynamic';

export default async function Page(){
 const userId=await getAuthenticatedUserId();if(!userId)return null;
 const{feed,follows,matches,topics,variant}=await getRecommendationHub();
 const ad=await getAdForPlacement('for_you_inline',feed[0]?.creatorId??null);
 return <section className="forYouPage">
  <div className="pageHeader forYouHeader"><div><p className="eyebrow">Tres motores · contenido + social + dating</p><h1>Para ti</h1><p className="muted">CitaFuego aprende temas, afinidad social y compatibilidad de citas. También mide exposición, clics y tiempo de atención para mejorar el ranking sin saltarse tus controles de privacidad.</p></div><Link href="/descubrir" className="ghostButton">Ajustar preferencias</Link></div>
  <div className="learnedTopicsPanel"><div><strong>Temas que el sistema está aprendiendo</strong><small>Experimento activo: {variant}</small></div>{topics.length?<div className="topicChips">{topics.map(t=><span key={t.topicId}>{t.label}<b>{Math.max(1,Math.round(t.weight))}</b></span>)}</div>:<p className="muted">Aún estamos en fase de descubrimiento. Tus intereses elegidos y las próximas interacciones servirán como señales de arranque.</p>}</div>

  {feed.length?<div className="forYouFeed">{feed.map((item,index)=>{
   let content=null;
   if(item.type==='blog'&&item.blog)content=<BlogCard post={item.blog} currentUserId={userId}/>;
   if(item.type==='story'&&item.story)content=<StoryCard story={item.story} currentUserId={userId}/>;
   if(item.type==='profile'&&item.profile){const p=item.profile.profile;const photo=item.profile.photos.find(x=>x.primary)?.url??item.profile.photos[0]?.url??null;content=<article className="recommendedProfileCard"><Link href={`/perfil/${p.id}`} className="recommendedProfileMain">{photo?<span className="recommendedAvatar"><Image src={photo} alt={p.displayName} fill sizes="88px" unoptimized/></span>:<span className="avatarPlaceholder large">{p.displayName.slice(0,1)}</span>}<div><h2>{p.displayName} {p.verified?<span className="verifiedBadge">✓</span>:null}</h2>{item.profile.handle?<p>@{item.profile.handle}</p>:null}<small>{p.district??p.city}{p.occupation?` · ${p.occupation}`:''}</small></div></Link><div className="recommendedProfileActions"><FollowButton targetId={p.id} initialFollowing={item.profile.viewerFollows} initialFollowers={item.profile.followers}/><Link className="ghostButton" href={`/perfil/${p.id}`}>Ver perfil</Link></div></article>}
   if(!content)return null;
   return <div key={`${item.type}-${item.id}`} className="recommendedBlock"><RecommendationFrame itemType={item.type} itemId={item.id} creatorId={item.creatorId} position={index} reason={item.reason}>{content}</RecommendationFrame>{index===3&&ad?<AdCard ad={ad}/>:null}</div>;
  })}</div>:<div className="emptyState"><h2>Tu feed está aprendiendo</h2><p>Explora perfiles, mira Stories, guarda blogs y conversa con tus Matches. El feed usa esas señales y una estrategia de arranque diversa para evitar quedarse vacío.</p><Link className="primaryButton" href="/descubrir">Empezar a descubrir</Link></div>}

  <section className="recommendationSection"><div className="sectionTitle"><div><p className="eyebrow">Amplía tu círculo</p><h2>A quién seguir</h2></div><Link href="/blog">Explorar contenido</Link></div>{follows.length?<div className="recommendationPeopleGrid">{follows.map((person)=><article key={person.profileId}><Link href={`/perfil/${person.profileId}`} className="recommendationPersonLink">{person.photoUrl?<span className="recommendationThumb"><Image src={person.photoUrl} alt={person.displayName} fill sizes="72px" unoptimized/></span>:<span className="avatarPlaceholder">{person.displayName.slice(0,1)}</span>}<div><strong>{person.displayName} {person.verified?'✓':''}</strong><small>{person.district??'Lima'}</small><p>{person.reason}</p></div></Link><FollowButton targetId={person.profileId} showCount={false}/></article>)}</div>:<p className="muted">Aún no hay recomendaciones suficientes.</p>}</section>

  <section className="recommendationSection"><div className="sectionTitle"><div><p className="eyebrow">Dating + red + afinidad temática</p><h2>Matches potenciales</h2></div><Link href="/descubrir">Ver Discovery</Link></div>{matches.length?<div className="potentialMatchGrid">{matches.map((person)=><Link href={`/perfil/${person.profileId}`} key={person.profileId} className="potentialMatchCard">{person.photoUrl?<div className="potentialMatchPhoto"><Image src={person.photoUrl} alt={person.displayName} fill sizes="(max-width:680px) 45vw, 220px" unoptimized/></div>:<div className="potentialMatchPhoto placeholder"><span>{person.displayName.slice(0,1)}</span></div>}<div className="potentialMatchCopy"><strong>{person.displayName}, {person.age} {person.verified?'✓':''}</strong><small>{person.district??'Lima'} · {person.distanceBucket}</small><p>{person.reason}</p><div><span>🔥 {person.chemistryScore}% química</span>{person.sharedInterestCount>0?<span>{person.sharedInterestCount} intereses</span>:null}</div></div></Link>)}</div>:<p className="muted">Cuando haya más señales de compatibilidad, aparecerán aquí.</p>}</section>
 </section>;
}
