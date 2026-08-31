'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {TrustMark} from '@/components/profile/trust-mark';
import type{DiscoverProfile,RelationshipIntent}from '@/lib/types';

const intentLabels:Record<RelationshipIntent,string>={serious:'Relación seria',meet_people:'Conocer gente',casual:'Algo casual',friendship:'Amistad',open_to_see:'Ver qué pasa'};
const promptLabels:Record<string,string>={plan_ideal:'Mi plan ideal',me_gana:'Me conquistas si',domingo:'Un domingo perfecto',viaje:'Un viaje pendiente',obsesion:'Ahora mismo me obsesiona',primera_cita:'Para una primera cita'};
type ViewMode='swipe'|'grid'|'list';
type Segment='for_you'|'nearby'|'online'|'verified'|'compatible'|'featured';

export function DiscoverDeck({initialProfiles,initialHasMore}:{initialProfiles:DiscoverProfile[];initialHasMore:boolean}){
  const router=useRouter();
  const[profiles,setProfiles]=useState(initialProfiles);const[index,setIndex]=useState(0);const[viewMode,setViewMode]=useState<ViewMode>(()=>{if(typeof window==='undefined')return'swipe';const saved=window.localStorage.getItem('citafuego:discover-view');return saved==='grid'||saved==='list'?saved:'swipe'});const[segment,setSegment]=useState<Segment>('for_you');const[toast,setToast]=useState('');const[busy,setBusy]=useState(false);const[hasMore,setHasMore]=useState(initialHasMore);const[photoIndex,setPhotoIndex]=useState(0);const[dragX,setDragX]=useState(0);const[match,setMatch]=useState<{name:string;conversationId:string}|null>(null);const pointerStart=useRef<{x:number;y:number}|null>(null);
  const profile=profiles[index];
  const photos=profile?(profile.imageUrls?.length?profile.imageUrls:[profile.imageUrl]):[];

  function changeView(next:ViewMode){setViewMode(next);window.localStorage.setItem('citafuego:discover-view',next)}

  useEffect(()=>{if(!profile)return;void fetch('/api/analytics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventName:'profile_impression',properties:{targetUserId:profile.id,score:profile.chemistryScore,online:profile.isOnline,boosted:profile.isBoosted}})})},[profile]);
  function resetMedia(){setPhotoIndex(0);setDragX(0);pointerStart.current=null}
  async function refill(){if(busy||!hasMore)return;setBusy(true);const response=await fetch('/api/discovery?offset=0');const data=await response.json();setBusy(false);if(response.ok){const next=(data.profiles??[])as DiscoverProfile[];resetMedia();setProfiles(next);setIndex(0);setHasMore(Boolean(data.hasMore))}}
  function advanceProfile(){const nextIndex=index+1;resetMedia();setIndex(nextIndex);if(nextIndex>=profiles.length&&hasMore)void refill()}
  async function decide(action:'pass'|'like'){if(!profile||busy||match)return;setBusy(true);const response=await fetch('/api/interactions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({toUserId:profile.id,action})});const data=await response.json().catch(()=>({}));setBusy(false);if(!response.ok){setToast(data.error==='daily_like_limit_reached'?'Llegaste al límite de Likes de hoy.':data.error==='verified_sender_required'?'Esta persona acepta Likes únicamente de perfiles verificados. Puedes verificarte desde tu perfil si quieres conectar con ella.':'No pudimos guardar la acción.');return}if(data.matched){setMatch({name:profile.name,conversationId:data.conversation_id});setToast('');return}setToast(action==='like'?`Like enviado a ${profile.name}`:'Siguiente perfil');advanceProfile()}
  async function rewind(){if(match)return;setBusy(true);const response=await fetch('/api/rewind',{method:'POST'});const data=await response.json().catch(()=>({}));setBusy(false);if(!response.ok||!data.rewound){setToast('No hay un perfil para recuperar.');return}setToast('Perfil recuperado.');resetMedia();await refill()}
  function continueAfterMatch(){setMatch(null);setToast('Match guardado. Puedes escribirle cuando quieras.');advanceProfile()}
  function pointerDown(e:React.PointerEvent<HTMLDivElement>){if(busy||match)return;pointerStart.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId)}
  function pointerMove(e:React.PointerEvent<HTMLDivElement>){const s=pointerStart.current;if(!s||busy||match)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)>Math.abs(dy))setDragX(Math.max(-130,Math.min(130,dx)));else setDragX(0)}
  function pointerEnd(e:React.PointerEvent<HTMLDivElement>){const s=pointerStart.current;if(!s)return;const dx=e.clientX-s.x,dy=e.clientY-s.y;pointerStart.current=null;setDragX(0);if(Math.abs(dx)>=72&&Math.abs(dx)>Math.abs(dy)){void decide(dx>0?'like':'pass');return}if(Math.abs(dx)<10&&Math.abs(dy)<10&&photos.length>1){const r=e.currentTarget.getBoundingClientRect();const ratio=(e.clientX-r.left)/r.width;if(ratio<.45)setPhotoIndex(c=>(c-1+photos.length)%photos.length);else if(ratio>.55)setPhotoIndex(c=>(c+1)%photos.length)}}

  if(!profile)return <section className="emptyState"><p className="eyebrow">Feed honesto</p><h1>Eso es todo por ahora</h1><p>CitaFuego no rellena el feed con perfiles falsos ni repite personas para simular actividad.</p><div className="heroActions">{hasMore?<button className="ctaButton" onClick={()=>void refill()}>Cargar más perfiles</button>:<Link className="ctaButton" href="/onboarding?edit=1">Ajustar preferencias</Link>}<Link className="ghostButton" href="/comunidad">Explorar comunidad</Link></div></section>;

  const segmentProfiles=profiles.filter(item=>segment==='for_you'||segment==='online'&&item.isOnline||segment==='verified'&&(item.verified||item.identityVerified)||segment==='compatible'&&item.chemistryScore>=75||segment==='featured'&&item.isBoosted||segment==='nearby');
  const browseControls=<><div className="discoverSegments" aria-label="Filtros de descubrimiento">{([['for_you','Para ti'],['nearby','Cerca'],['online','Online'],['verified','Verificados'],['compatible','Compatibles'],['featured','Destacados']] as const).map(([key,label])=><button type="button" key={key} aria-pressed={segment===key} onClick={()=>setSegment(key)}>{label}</button>)}</div><div className="discoverViewModes" aria-label="Vista de perfiles">{([['swipe','Swipe'],['grid','Cuadrícula'],['list','Lista']] as const).map(([key,label])=><button type="button" key={key} aria-pressed={viewMode===key} onClick={()=>changeView(key)}>{label}</button>)}</div></>;
  if(viewMode!=='swipe')return <section className="immersiveDiscover discoverBrowse"><div className="discoverTopline iosLargeHeader"><div><p className="eyebrow">Personas reales · Lima</p><h1>Descubrir</h1></div><Link className="filterButton" href="/onboarding?edit=1">Preferencias</Link></div>{browseControls}<div className={viewMode==='grid'?'discoverProfileGrid':'discoverProfileList'}>{segmentProfiles.map(item=><article className="discoverProfileTile" key={item.id}><div className="discoverTileMedia"><Image src={item.imageUrl} alt={item.hasPhoto?`Foto de ${item.name}`:`Perfil de ${item.name} sin foto`} fill sizes={viewMode==='grid'?'(max-width:560px) 50vw,240px':'96px'}/></div><div><h2>{item.name}, {item.age}</h2><p>{item.district} · {item.distanceBucket}</p><strong>🔥 {item.chemistryScore}% química</strong><Link href={`/perfil/${item.id}`}>Abrir perfil</Link></div></article>)}</div>{!segmentProfiles.length?<div className="emptyState"><p>No hay perfiles reales en este filtro por ahora.</p></div>:null}</section>;

  const transform=dragX?`translate3d(${dragX}px,0,0) rotate(${dragX/100}deg)`:undefined;
  const hasPhoto=Boolean(profile.hasPhoto);
  return <section className="immersiveDiscover">
    <div className="discoverTopline iosLargeHeader"><div><p className="eyebrow">Personas reales · Lima</p><h1>Descubrir</h1></div><div className="toplineActions"><Link className="filterButton" href="/azar">⚡ Al azar</Link><Link className="filterButton" href="/onboarding?edit=1">Preferencias</Link></div></div>{browseControls}
    <article className="profileCard immersiveProfileCard" style={{transform,opacity:dragX?Math.max(.82,1-Math.abs(dragX)/520):undefined}}>
      <div className="profileMedia immersiveProfileMedia" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={resetMedia}>
        <Image key={photos[photoIndex]??profile.imageUrl} src={photos[photoIndex]??profile.imageUrl} alt={hasPhoto?`Foto ${photoIndex+1} de ${profile.name}`:`Perfil de ${profile.name} sin foto`} fill priority sizes="(max-width:560px) 100vw,720px"/>
        <div className="mediaShade"/>
        {hasPhoto&&photos.length>1?<><div className="photoProgress" aria-label={`${photos.length} fotos`}>{photos.map((_,i)=><button key={i} type="button" className={i===photoIndex?'active':''} aria-label={`Ver foto ${i+1}`} onPointerDown={e=>e.stopPropagation()} onClick={()=>setPhotoIndex(i)}/>)}</div><span className="photoCounter">{photoIndex+1}/{photos.length}</span></>:null}
        <div className="profileStatusRail">{profile.isOnline?<span className="onlineBadge">● Activo ahora</span>:null}{profile.isBoosted?<span className="boostBadge">⚡ Boost</span>:null}</div>
        <div className="profileOverlay"><div className="nameLine"><h2>{profile.name}, {profile.age}</h2><TrustMark hasPhoto={hasPhoto} verified={profile.verified} identityVerified={profile.identityVerified}/></div><p>{profile.district} · {profile.distanceBucket} · {intentLabels[profile.intent]}</p><div className="chemistryBadge">🔥 {profile.chemistryScore}% química · {profile.sharedInterestCount} intereses en común</div></div>
      </div>
      <div className="profileBody immersiveProfileBody"><p className="matchReason">✦ {profile.learningReason}</p>{profile.bio?<p>{profile.bio}</p>:<p className="muted">Este perfil todavía no añadió una bio.</p>}<div className="chips" aria-label="Intereses">{profile.interests.map(interest=><span className="chip" key={interest}>{interest}</span>)}</div>{profile.prompts.length?<div className="promptPreviewStack">{profile.prompts.slice(0,2).map((p,i)=><div className="promptPreview" key={`${p.key}-${i}`}><small>{promptLabels[p.key]??p.key}</small><strong>{p.answer}</strong></div>)}</div>:null}<Link className="viewProfileLink" href={`/perfil/${profile.id}`}>Ver perfil completo <span aria-hidden="true">›</span></Link></div>
    </article>
    <p className="swipeHint">← pasar · → Like{hasPhoto&&photos.length>1?' · toca los lados para cambiar de foto':''}</p>
    <div className="decisionBar iosDecisionBar" aria-label="Acciones del perfil"><button className="roundAction secondaryAction" disabled={busy} onClick={()=>void rewind()} aria-label="Recuperar perfil anterior" title="Recuperar">↶</button><button className="roundAction secondaryAction" disabled={busy} onClick={()=>void decide('pass')} aria-label={`Omitir a ${profile.name}`} title="Pasar">×</button><button className="roundAction primaryAction" disabled={busy} onClick={()=>void decide('like')} aria-label={`Dar Like a ${profile.name}`} title="Like">♡</button></div>
    {toast?<div className="toast iosToast" role="status" aria-live="polite">{toast}</div>:null}
    {match?<div className="reportDialog matchDialog" role="dialog" aria-modal="true" aria-labelledby="match-title"><div className="onboardingCard safetySheet matchSheet"><p className="eyebrow">🔥 Conexión mutua</p><h2 id="match-title">¡Hicieron Match!</h2><p>Tú y {match.name} se gustan. Elige qué quieres hacer ahora.</p><div className="dialogActions"><button className="ghostButton" onClick={continueAfterMatch}>Seguir descubriendo</button><button className="ctaButton" onClick={()=>router.push(`/chats/${match.conversationId}`)}>Enviar mensaje</button></div></div></div>:null}
  </section>;
}
