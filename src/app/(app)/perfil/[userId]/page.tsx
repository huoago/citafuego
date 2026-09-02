import Image from 'next/image';
import Link from 'next/link';
import { notFound,redirect } from 'next/navigation';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { getSocialProfile,getStories,getPublicIdentityDetails } from '@/lib/social/server';
import { getBlogFeed } from '@/lib/blog/server';
import { recordProfileView } from '@/lib/recommendations/signals';
import { BlogCard } from '@/components/blog/blog-card';
import { FollowButton } from '@/components/social/follow-button';
import { ReportContentButton } from '@/components/social/report-content-button';
import { StoryCard } from '@/components/stories/story-card';
import { TrustMark } from '@/components/profile/trust-mark';

const promptLabels:Record<string,string>={plan_ideal:'Mi plan ideal es…',me_gana:'Me conquistas si…',domingo:'Un domingo perfecto…',viaje:'Un viaje que tengo pendiente…',obsesion:'Ahora mismo me obsesiona…',primera_cita:'Para una primera cita prefiero…'};
const identityLabels:Record<string,string>={heterosexual:'Heterosexual',gay:'Gay',lesbian:'Lesbiana',bisexual:'Bisexual',pansexual:'Pansexual',asexual:'Asexual',demisexual:'Demisexual',queer:'Queer',questioning:'Explorando',monogamous:'Monogamia',open_relationship:'Relación abierta',polyamorous:'Poliamor',non_monogamous:'No monogamia',single:'Soltería',exploring:'Explorando',dating:'Citas',relationship:'Relación',friendship:'Amistad',casual:'Algo casual',conversation:'Conversación',events:'Eventos',travel:'Viajes',kink_friendly:'Kink-friendly',slow_dating:'Slow dating',long_term:'Largo plazo'};
const intentLabels:Record<string,string>={serious:'Relación seria',meet_people:'Conocer gente',casual:'Algo casual',friendship:'Amistad',open_to_see:'Abierto/a a ver qué surge'};
const whatsappHref=(number:string)=>`https://wa.me/${number.replace(/\D/g,'')}`;
const formatWhatsapp=(number:string)=>number.replace(/^(\+\d{1,3})(\d+)/,'$1 $2');
export const dynamic='force-dynamic';

export default async function Page({params}:{params:Promise<{userId:string}>}){
  const me=await getAuthenticatedUserId();if(!me)return null;
  const{userId}=await params;if(!z.string().uuid().safeParse(userId).success)notFound();if(userId===me)redirect('/perfil');
  await recordProfileView(userId);
  const[bundle,posts,stories,identity]=await Promise.all([getSocialProfile(userId),getBlogFeed(userId,30),getStories(userId),getPublicIdentityDetails(userId)]);
  if(!bundle)notFound();
  const p=bundle.profile;
  const leadPhoto=bundle.photos.find(ph=>ph.primary&&ph.url)||bundle.photos.find(ph=>ph.url)||null;
  const hasPhoto=Boolean(leadPhoto);
  const trustLabel=hasPhoto&&p.verified?'Confianza avanzada':p.verified?'Perfil verificado':hasPhoto?'Fotos aprobadas':'Perfil estándar';
  const location=[p.district,p.city].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(' · ');

  return <section className="socialProfilePage directoryProfilePage">
    <div className="directoryProfileHero">
      <div className="directoryProfileLeadMedia">
        {leadPhoto?.url?<Image src={leadPhoto.url} alt={`Foto principal de ${p.displayName}`} fill priority sizes="(max-width: 760px) 100vw, 52vw" unoptimized/>:<div className="directoryProfilePlaceholder" aria-label="Perfil sin foto"><span>{p.displayName.slice(0,1).toUpperCase()}</span><small>Sin foto pública</small></div>}
        <div className="directoryProfileMediaShade"/>
        <div className="directoryProfileMediaCaption"><span className="profileAvailabilityDot" aria-hidden="true"/><span>{trustLabel}</span></div>
      </div>
      <div className="directoryProfileIdentity">
        <p className="eyebrow">Perfil social</p>
        <div className="directoryProfileName"><h1>{p.displayName}</h1><TrustMark hasPhoto={hasPhoto} verified={p.verified}/></div>
        {bundle.handle?<p className="socialHandle">@{bundle.handle}</p>:null}
        <p className="directoryProfileLocation">⌖ {location||'Lima, Perú'}</p>
        <div className="directoryProfileQuickFacts">
          <span>{intentLabels[p.intent]??p.intent}</span>
          {p.occupation?<span>{p.occupation}</span>:null}
          {p.heightCm?<span>{p.heightCm} cm</span>:null}
          {p.languages.length?<span>{p.languages.join(' · ')}</span>:null}
        </div>

        <section className="directoryContactCard" aria-labelledby="contact-title">
          <div><p className="eyebrow">Contacto</p><h2 id="contact-title">Contactar a {p.displayName}</h2></div>
          {bundle.whatsapp?<><p className="directoryContactValue">WhatsApp · {formatWhatsapp(bundle.whatsapp)}</p><a className="whatsappContactButton directoryWhatsappButton" href={whatsappHref(bundle.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp con ${p.displayName}`}><span className="whatsappContactIcon" aria-hidden="true">◉</span><span><strong>Abrir WhatsApp</strong><small>Contacto compartido por esta persona</small></span></a></>:<p className="directoryContactPrivate">Esta persona no comparte un contacto público. Puedes seguirla, hacer Match y conversar dentro de CitaFuego.</p>}
        </section>

        <div className="socialHeroActions directoryProfileActions"><FollowButton targetId={userId} initialFollowing={bundle.viewerFollows} initialFollowers={bundle.followers}/><ReportContentButton type="profile" contentId={userId} label="Reportar perfil"/></div>
      </div>
    </div>

    <div className="socialStats directorySocialStats"><Link href={`/perfil/${userId}/seguidores`}><strong>{bundle.followers}</strong><span>Seguidores</span></Link><Link href={`/perfil/${userId}/seguidos`}><strong>{bundle.following}</strong><span>Siguiendo</span></Link><span><strong>{bundle.isMatch?'✓':'—'}</strong><span>{bundle.isMatch?'Match':'Sin Match'}</span></span><span><strong>{bundle.activeStories}</strong><span>Stories activas</span></span></div>

    <section className="profileSection directoryAboutSection"><div className="sectionTitle"><h2>Sobre {p.displayName}</h2><span>{location}</span></div><div className="directoryAboutCard"><p>{p.bio||'Esta persona todavía no añadió una presentación.'}</p><div className="profileFacts"><span>Intención: {intentLabels[p.intent]??p.intent}</span>{p.languages.length?<span>Idiomas: {p.languages.join(', ')}</span>:null}{bundle.followsViewer?<span>Te sigue</span>:null}</div></div></section>

    <section className="profileSection"><div className="sectionTitle"><h2>Galería</h2><span>{bundle.photos.length} fotos</span></div>{bundle.photos.length?<div className="profileGallery directoryProfileGallery">{bundle.photos.map((ph,i)=>ph.url?<div className={`profileGalleryItem${ph.primary?' primary':''}`} key={ph.id}><Image src={ph.url} alt={`Foto ${i+1} de ${p.displayName}`} fill sizes="(max-width: 680px) 50vw, 33vw" unoptimized/>{ph.primary?<span>Principal</span>:null}</div>:null)}</div>:<p className="muted">Este perfil todavía no añadió fotos públicas.</p>}</section>

    {identity?<section className="profileSection"><h2>Identidad y preferencias</h2><div className="softPanel identityPublic"><div className="chips">{identity.pronouns?<span className="chip">{identity.pronouns}</span>:null}{identity.sexualOrientations.map(x=><span className="chip" key={`o-${x}`}>{identityLabels[x]??x}</span>)}{identity.relationshipStyles.map(x=><span className="chip" key={`r-${x}`}>{identityLabels[x]??x}</span>)}{identity.desires.map(x=><span className="chip" key={`d-${x}`}>{identityLabels[x]??x}</span>)}</div>{identity.languages.length?<p className="muted">Idiomas: {identity.languages.join(', ')}</p>:null}</div></section>:null}
    {bundle.prompts.length?<section className="profileSection"><h2>Conoce más</h2><div className="promptPublicGrid">{bundle.prompts.map(pr=><article key={pr.slot}><small>{promptLabels[pr.promptKey]??pr.promptKey}</small><p>{pr.answer}</p></article>)}</div></section>:null}
    {stories.length?<section className="profileSection"><div className="sectionTitle"><h2>Stories</h2><Link href={`/stories/${stories[0].storyId}`}>Ver todas</Link></div><div className="storyFeed compact">{stories.slice(0,3).map(s=><StoryCard key={s.storyId} story={s} currentUserId={me}/>)}</div></section>:null}
    <section className="profileSection"><div className="sectionTitle"><h2>Publicaciones visibles para ti</h2><span>{posts.length}</span></div>{posts.length?<div className="blogFeed">{posts.map(post=><BlogCard key={post.postId} post={post} currentUserId={me}/>)}</div>:<div className="softPanel"><p>No hay publicaciones que puedas ver.</p></div>}</section>
  </section>;
}
