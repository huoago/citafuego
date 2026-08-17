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
 const{feed,follows,matches,topics}=await getRecommendationHub();
 const adInsertionIndex=Math.min(3,Math.max(feed.length-1,0));
 const ad=feed.length?await getAdForPlacement('for_you_inline',feed[adInsertionIndex]?.creatorId??null):null;
 return <section className="forYouPage">
  <div className="socialFeedIntro">
   <div><p className="eyebrow">Tu espacio social</p><h1>Inicio</h1><p>Personas, momentos y conversaciones relevantes para ti, sin leer el contenido privado de tus chats.</p></div>
   <div className="feedControl iosSegmented" aria-label="Cambiar sección social"><Link className="active" href="/para-ti">Para ti</Link><Link href="/blog">Comunidad</Link><Link href="/stories">Stories</Link></div>
  </div>

  <nav className="socialQuickRail" aria-label="Accesos rápidos">
   <Link className="socialQuickLink hot" href="/stories"><b>◉</b><span>Stories · 24 h</span></Link>
   <Link className="socialQuickLink" href="/blog"><b>▤</b><span>Conversaciones</span></Link>
   <Link className="socialQuickLink" href="/descubrir"><b>✦</b><span>Descubrir personas</span></Link>
   <Link className="socialQuickLink" href="/guardados"><b>⌑</b><span>Guardados</span></Link>
   <Link className="socialQuickLink" href="/likes"><b>♥</b><span>Likes recibidos</span></Link>
  </nav>

  <div className="feedTuneCard">
   <div><strong>Tu feed se adapta contigo</strong><p>Likes, guardados, Stories y relaciones ayudan a ordenar lo relevante. Puedes ignorar contenido sin romper tus conexiones.</p></div>
   {topics.length?<div className="topicChips" aria-label="Intereses aprendidos">{topics.slice(0,3).map(t=><span key={t.topicId}>{t.label}</span>)}</div>:<Link className="ghostButton" href="/descubrir">Explorar</Link>}
  </div>

  {feed.length?<div className="forYouFeed">{feed.map((item,index)=>{
   let content=null;
   if(item.type==='blog'&&item.blog)content=<BlogCard post={item.blog} currentUserId={userId}/>;
   if(item.type==='story'&&item.story)content=<StoryCard story={item.story} currentUserId={userId}/>;
   if(item.type==='profile'&&item.profile){const p=item.profile.profile;const photo=item.profile.photos.find(x=>x.primary)?.url??item.profile.photos[0]?.url??null;content=<article className="recommendedProfileCard"><Link href={`/perfil/${p.id}`} className="recommendedProfileMain">{photo?<span className="recommendedAvatar"><Image src={photo} alt={p.displayName} fill sizes="88px" unoptimized/></span>:<span className="avatarPlaceholder large">{p.displayName.slice(0,1)}</span>}<div><h2>{p.displayName} {p.verified?<span className="verifiedBadge">✓</span>:null}</h2>{item.profile.handle?<p>@{item.profile.handle}</p>:null}<small>{p.district??p.city}{p.occupation?` · ${p.occupation}`:''}</small></div></Link><div className="recommendedProfileActions"><FollowButton targetId={p.id} initialFollowing={item.profile.viewerFollows} initialFollowers={item.profile.followers}/><Link className="ghostButton" href={`/perfil/${p.id}`}>Perfil</Link></div></article>}
   if(!content)return null;
   return <div key={`${item.type}-${item.id}`} className="recommendedBlock"><RecommendationFrame itemType={item.type} itemId={item.id} creatorId={item.creatorId} position={index} reason={item.reason}>{content}</RecommendationFrame>{index===adInsertionIndex&&ad?<AdCard ad={ad}/>:null}</div>;
  })}</div>:<div className="emptyState"><p className="eyebrow">Empieza tu red</p><h2>Tu Inicio está listo para aprender</h2><p>Ahora mismo no hay publicaciones ni perfiles visibles en tu feed. Descubre personas, crea una Story o publica algo para empezar a construir tu círculo.</p><div className="heroActions"><Link className="primaryButton" href="/descubrir">Descubrir personas</Link><Link className="ghostButton" href="/stories/nuevo">Crear Story</Link></div></div>}

  <section className="recommendationSection"><div className="sectionTitle"><div><p className="eyebrow">Personas afines</p><h2>A quién seguir</h2></div><Link href="/blog">Ver comunidad</Link></div>{follows.length?<div className="recommendationPeopleGrid">{follows.map((person)=><article key={person.profileId}><Link href={`/perfil/${person.profileId}`} className="recommendationPersonLink">{person.photoUrl?<span className="recommendationThumb"><Image src={person.photoUrl} alt={person.displayName} fill sizes="72px" unoptimized/></span>:<span className="avatarPlaceholder">{person.displayName.slice(0,1)}</span>}<div><strong>{person.displayName} {person.verified?'✓':''}</strong><small>{person.district??'Lima'}</small><p>{person.reason}</p></div></Link><FollowButton targetId={person.profileId} showCount={false}/></article>)}</div>:<p className="muted">Cuando haya más personas compatibles, aparecerán aquí.</p>}</section>

  <section className="recommendationSection"><div className="sectionTitle"><div><p className="eyebrow">Dating + afinidad</p><h2>Matches potenciales</h2></div><Link href="/descubrir">Abrir Discovery</Link></div>{matches.length?<div className="potentialMatchGrid">{matches.map((person)=><Link href={`/perfil/${person.profileId}`} key={person.profileId} className="potentialMatchCard">{person.photoUrl?<div className="potentialMatchPhoto"><Image src={person.photoUrl} alt={person.displayName} fill sizes="(max-width:680px) 45vw, 220px" unoptimized/></div>:<div className="potentialMatchPhoto placeholder"><span>{person.displayName.slice(0,1)}</span></div>}<div className="potentialMatchCopy"><strong>{person.displayName}, {person.age} {person.verified?'✓':''}</strong><small>{person.district??'Lima'} · {person.distanceBucket}</small><p>{person.reason}</p><div><span>🔥 {person.chemistryScore}% química</span>{person.sharedInterestCount>0?<span>{person.sharedInterestCount} intereses</span>:null}</div></div></Link>)}</div>:<p className="muted">Cuando haya más señales de compatibilidad, aparecerán aquí.</p>}</section>
 </section>;
}
