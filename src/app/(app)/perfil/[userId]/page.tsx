import Image from 'next/image';
import Link from 'next/link';
import { notFound,redirect } from 'next/navigation';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { getSocialProfile,getStories,getPublicIdentityDetails } from '@/lib/social/server';
import { getBlogFeed } from '@/lib/blog/server';
import { recordProfileView } from '@/lib/recommendations/signals';
import { BlogCard } from '@/components/blog/blog-card';
import { DirectoryProfileGallery } from '@/components/profile/directory-profile-gallery';
import { FollowButton } from '@/components/social/follow-button';
import { ReportContentButton } from '@/components/social/report-content-button';
import { StoryCard } from '@/components/stories/story-card';
import { TrustMark } from '@/components/profile/trust-mark';

const promptLabels:Record<string,string>={plan_ideal:'Mi plan ideal es…',me_gana:'Me conquistas si…',domingo:'Un domingo perfecto…',viaje:'Un viaje que tengo pendiente…',obsesion:'Ahora mismo me obsesiona…',primera_cita:'Para una primera cita prefiero…'};
const identityLabels:Record<string,string>={heterosexual:'Heterosexual',gay:'Gay',lesbian:'Lesbiana',bisexual:'Bisexual',pansexual:'Pansexual',asexual:'Asexual',demisexual:'Demisexual',queer:'Queer',questioning:'Explorando',monogamous:'Monogamia',open_relationship:'Relación abierta',polyamorous:'Poliamor',non_monogamous:'No monogamia',single:'Soltería',exploring:'Explorando',dating:'Citas',relationship:'Relación',friendship:'Amistad',casual:'Algo casual',conversation:'Conversación',events:'Eventos',travel:'Viajes',kink_friendly:'Kink-friendly',slow_dating:'Slow dating',long_term:'Largo plazo'};
const intentLabels:Record<string,string>={serious:'Relación seria',meet_people:'Conocer gente',casual:'Algo casual',friendship:'Amistad',open_to_see:'Abierto/a a ver qué surge'};
const whatsappHref=(number:string)=>`https://wa.me/${number.replace(/\D/g,'')}`;
const formatWhatsapp=(number:string)=>number.replace(/^(\+\d{1,3})(\d+)/,'$1 $2');
const displayValue=(value:string|null|undefined,fallback='No indicado')=>value?.trim()||fallback;
export const dynamic='force-dynamic';

export default async function Page({params}:{params:Promise<{userId:string}>}){
  const me=await getAuthenticatedUserId();if(!me)return null;
  const{userId}=await params;if(!z.string().uuid().safeParse(userId).success)notFound();if(userId===me)redirect('/perfil');
  await recordProfileView(userId);
  const[bundle,posts,stories,identity]=await Promise.all([getSocialProfile(userId),getBlogFeed(userId,30),getStories(userId),getPublicIdentityDetails(userId)]);
  if(!bundle)notFound();
  const p=bundle.profile;
  const publicPhotos=bundle.photos.filter(photo=>photo.url);
  const hasPhoto=publicPhotos.length>0;
  const trustLabel=p.verified?'Foto real verificada':hasPhoto?'Fotos aprobadas':'Perfil sin foto verificada';
  const location=[p.district,p.city].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(' · ')||'Lima, Perú';
  const lastActiveLabel=p.lastActiveAt?`Actividad · ${new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(p.lastActiveAt))}`:'Actividad no publicada';
  const identityItems=identity?[...(identity.pronouns?[identity.pronouns]:[]),...identity.sexualOrientations.map(x=>identityLabels[x]??x),...identity.relationshipStyles.map(x=>identityLabels[x]??x),...identity.desires.map(x=>identityLabels[x]??x)]:[];

  return <section className="pkProfilePage" data-social-profile-v22>
    <div className="pkProfileHero">
      <DirectoryProfileGallery photos={bundle.photos} name={p.displayName} lastActiveLabel={lastActiveLabel}/>

      <aside className="pkProfileCard">
        <p className="pkProfileEyebrow">Perfil social · CitaFuego</p>
        <div className="pkNameRow"><h1>{p.displayName}</h1><TrustMark hasPhoto={hasPhoto} verified={p.verified}/></div>
        {bundle.handle?<p className="pkHandle">@{bundle.handle}</p>:null}
        <p className="pkLocation">⌖ {location}</p>
        <div className="pkTrustLine"><span aria-hidden="true">✓</span><strong>{trustLabel}</strong></div>
        <div className="pkQuickFacts">
          <span>{intentLabels[p.intent]??p.intent}</span>
          {p.genderIdentity?<span>{p.genderIdentity}</span>:null}
          {p.occupation?<span>{p.occupation}</span>:null}
          {p.heightCm?<span>{p.heightCm} cm</span>:null}
          {p.languages.length?<span>{p.languages.join(' · ')}</span>:null}
        </div>

        <section className="pkContact" id="profile-contact" aria-labelledby="contact-title">
          <p className="pkProfileEyebrow">Contacto compartido</p>
          <h2 id="contact-title">Contactar a {p.displayName}</h2>
          {bundle.whatsapp?<><span className="pkContactNumber">WhatsApp · {formatWhatsapp(bundle.whatsapp)}</span><a className="whatsappContactButton directoryWhatsappButton" href={whatsappHref(bundle.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp con ${p.displayName}`}><span className="whatsappContactIcon" aria-hidden="true">◉</span><span><strong>Abrir WhatsApp</strong><small>Número publicado voluntariamente por esta persona</small></span></a></>:<p>Esta persona no comparte WhatsApp públicamente. Puedes seguirla, hacer Match y conversar dentro de CitaFuego.</p>}
        </section>

        <p className="pkBio">{p.bio||'Esta persona todavía no añadió una presentación.'}</p>
        <div className="pkProfileActions"><FollowButton targetId={userId} initialFollowing={bundle.viewerFollows} initialFollowers={bundle.followers} showCount={false}/><ReportContentButton type="profile" contentId={userId} label="Reportar perfil"/></div>
      </aside>
    </div>

    <nav className={`pkMobileActions ${!bundle.whatsapp&&!bundle.isMatch?'single':''}`} aria-label="Acciones rápidas del perfil">
      <a className="pkMobileAction primary" href="#profile-contact">Contacto</a>
      {bundle.whatsapp?<a className="pkMobileAction secondary" href={whatsappHref(bundle.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a>:bundle.isMatch?<Link className="pkMobileAction secondary" href="/chats">Chat CitaFuego</Link>:null}
    </nav>

    <div className="pkStats" aria-label="Actividad social">
      <Link href={`/perfil/${userId}/seguidores`}><strong>{bundle.followers}</strong><span>Seguidores</span></Link>
      <Link href={`/perfil/${userId}/seguidos`}><strong>{bundle.following}</strong><span>Siguiendo</span></Link>
      <span><strong>{bundle.isMatch?'✓':'—'}</strong><span>{bundle.isMatch?'Match':'Sin Match'}</span></span>
      <span><strong>{bundle.activeStories}</strong><span>Stories activas</span></span>
    </div>

    <div className="pkLowerGrid">
      <section className="pkSection">
        <div className="pkSectionHeader"><h2>Datos principales</h2><span>{location}</span></div>
        <div className="pkInfoGrid">
          <div className="pkInfoItem"><small>Intención</small><strong>{intentLabels[p.intent]??p.intent}</strong></div>
          <div className="pkInfoItem"><small>Distrito</small><strong>{displayValue(p.district,p.city||'Lima')}</strong></div>
          <div className="pkInfoItem"><small>Ocupación</small><strong>{displayValue(p.occupation)}</strong></div>
          <div className="pkInfoItem"><small>Estatura</small><strong>{p.heightCm?`${p.heightCm} cm`:'No indicada'}</strong></div>
          <div className="pkInfoItem"><small>Idiomas</small><strong>{p.languages.length?p.languages.join(', '):'No indicados'}</strong></div>
          <div className="pkInfoItem"><small>Estado de confianza</small><strong>{trustLabel}</strong></div>
        </div>
      </section>

      <section className="pkSection">
        <div className="pkSectionHeader"><h2>Identidad y preferencias</h2><span>Información compartida</span></div>
        {identityItems.length?<div className="chips">{identityItems.map((item,index)=><span className="chip" key={`${item}-${index}`}>{item}</span>)}</div>:<p className="pkEmpty">Esta persona no publicó más información de identidad o preferencias.</p>}
        {identity?.languages.length?<p className="muted">Idiomas preferidos: {identity.languages.join(', ')}</p>:null}
        {bundle.followsViewer?<p className="muted">Esta persona te sigue.</p>:null}
      </section>
    </div>

    <section className="pkSection">
      <div className="pkSectionHeader"><h2>Galería</h2><span>{publicPhotos.length} fotos públicas</span></div>
      {publicPhotos.length?<div className="pkGalleryGrid">{publicPhotos.map((photo,index)=><div className="pkGalleryItem" key={photo.id}><Image src={photo.url!} alt={`Foto ${index+1} de ${p.displayName}`} fill sizes="(max-width: 620px) 50vw, 30vw" unoptimized/>{photo.primary?<span>Principal</span>:null}</div>)}</div>:<p className="pkEmpty">Este perfil todavía no añadió fotos públicas.</p>}
    </section>

    {bundle.prompts.length?<section className="pkSection"><div className="pkSectionHeader"><h2>Conoce más</h2><span>{bundle.prompts.length} respuestas</span></div><div className="promptPublicGrid">{bundle.prompts.map(pr=><article key={pr.slot}><small>{promptLabels[pr.promptKey]??pr.promptKey}</small><p>{pr.answer}</p></article>)}</div></section>:null}

    {stories.length?<section className="pkSection"><div className="pkSectionHeader"><h2>Stories</h2><Link href={`/stories/${stories[0].storyId}`}>Ver todas</Link></div><div className="storyFeed compact">{stories.slice(0,3).map(s=><StoryCard key={s.storyId} story={s} currentUserId={me}/>)}</div></section>:null}

    <section className="pkSection"><div className="pkSectionHeader"><h2>Publicaciones visibles para ti</h2><span>{posts.length}</span></div>{posts.length?<div className="blogFeed">{posts.map(post=><BlogCard key={post.postId} post={post} currentUserId={me}/>)}</div>:<p className="pkEmpty">No hay publicaciones que puedas ver.</p>}</section>
  </section>;
}
