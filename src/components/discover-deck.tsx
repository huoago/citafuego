'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {TrustMark} from '@/components/profile/trust-mark';
import type{DiscoverProfile,RelationshipIntent}from '@/lib/types';
import styles from './discover-directory.module.css';

const intentLabels:Record<RelationshipIntent,string>={serious:'Relación seria',meet_people:'Conocer gente',casual:'Algo casual',friendship:'Amistad',open_to_see:'Ver qué pasa'};

export function DiscoverDeck({initialProfiles,initialHasMore}:{initialProfiles:DiscoverProfile[];initialHasMore:boolean}){
  const router=useRouter();
  const[profiles,setProfiles]=useState(initialProfiles);
  const[hasMore,setHasMore]=useState(initialHasMore);
  const[query,setQuery]=useState('');
  const[district,setDistrict]=useState('todos');
  const[intent,setIntent]=useState<'todos'|RelationshipIntent>('todos');
  const[verifiedOnly,setVerifiedOnly]=useState(false);
  const[onlineOnly,setOnlineOnly]=useState(false);
  const[view,setView]=useState<'grid'|'list'>('grid');
  const[busyId,setBusyId]=useState<string|null>(null);
  const[toast,setToast]=useState('');
  const[match,setMatch]=useState<{name:string;conversationId:string}|null>(null);

  const districts=useMemo(()=>Array.from(new Set(profiles.map(profile=>profile.district).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es')),[profiles]);
  const visible=useMemo(()=>profiles.filter(profile=>{
    if(district!=='todos'&&profile.district!==district)return false;
    if(intent!=='todos'&&profile.intent!==intent)return false;
    if(verifiedOnly&&!profile.verified&&!profile.identityVerified)return false;
    if(onlineOnly&&!profile.isOnline)return false;
    const text=`${profile.name} ${profile.district} ${profile.bio} ${profile.interests.join(' ')}`.toLowerCase();
    return !query.trim()||text.includes(query.trim().toLowerCase());
  }),[profiles,district,intent,verifiedOnly,onlineOnly,query]);

  useEffect(()=>{
    visible.slice(0,12).forEach(profile=>{
      void fetch('/api/analytics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventName:'profile_impression',properties:{targetUserId:profile.id,score:profile.chemistryScore,online:profile.isOnline,boosted:profile.isBoosted}})}).catch(()=>undefined);
    });
  },[visible]);

  async function decide(profile:DiscoverProfile,action:'pass'|'like'){
    if(busyId||match)return;
    setBusyId(profile.id);
    const response=await fetch('/api/interactions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({toUserId:profile.id,action})});
    const data=await response.json().catch(()=>({}));
    setBusyId(null);
    if(!response.ok){
      setToast(data.error==='daily_like_limit_reached'?'Llegaste al límite de Likes de hoy.':data.error==='verified_sender_required'?'Esta persona acepta Likes únicamente de perfiles verificados.':'No pudimos guardar la acción.');
      return;
    }
    if(data.matched){setMatch({name:profile.name,conversationId:data.conversation_id});return;}
    setProfiles(current=>current.filter(item=>item.id!==profile.id));
    setToast(action==='like'?`Like enviado a ${profile.name}`:'Perfil omitido');
  }

  async function loadMore(){
    if(busyId||!hasMore)return;
    setBusyId('load-more');
    const response=await fetch(`/api/discovery?offset=${profiles.length}`);
    const data=await response.json().catch(()=>({}));
    setBusyId(null);
    if(!response.ok){setToast('No pudimos cargar más perfiles.');return;}
    const next=(data.profiles??[]) as DiscoverProfile[];
    setProfiles(current=>[...current,...next.filter(profile=>!current.some(existing=>existing.id===profile.id))]);
    setHasMore(Boolean(data.hasMore));
  }

  function resetFilters(){setQuery('');setDistrict('todos');setIntent('todos');setVerifiedOnly(false);setOnlineOnly(false);}
  function continueAfterMatch(){setMatch(null);setToast('Match guardado. Puedes seguir explorando.');}

  if(!profiles.length)return <section className={styles.empty}><h2>Eso es todo por ahora</h2><p>CitaFuego no rellena el directorio con perfiles falsos para simular actividad.</p><Link href="/onboarding?edit=1">Ajustar preferencias</Link></section>;

  return <section className={styles.page}>
    <div className={styles.top}>
      <div><p className={styles.eyebrow}>Personas reales · Lima</p><h1>Descubrir</h1></div>
      <div className={styles.topActions}><Link href="/azar">⚡ Al azar</Link><Link href="/onboarding?edit=1">Preferencias</Link></div>
    </div>

    <div className={styles.filters} aria-label="Filtros de descubrimiento">
      <input className={styles.search} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por nombre, distrito o interés" aria-label="Buscar perfiles"/>
      <select className={styles.select} value={district} onChange={event=>setDistrict(event.target.value)} aria-label="Filtrar por distrito"><option value="todos">Todos los distritos</option>{districts.map(item=><option value={item} key={item}>{item}</option>)}</select>
      <select className={styles.select} value={intent} onChange={event=>setIntent(event.target.value as 'todos'|RelationshipIntent)} aria-label="Filtrar por intención"><option value="todos">Todas las intenciones</option>{(Object.keys(intentLabels) as RelationshipIntent[]).map(value=><option value={value} key={value}>{intentLabels[value]}</option>)}</select>
      <div className={styles.flags}><label><input type="checkbox" checked={verifiedOnly} onChange={event=>setVerifiedOnly(event.target.checked)}/> Verificados</label><label><input type="checkbox" checked={onlineOnly} onChange={event=>setOnlineOnly(event.target.checked)}/> Activos ahora</label></div>
    </div>

    <div className={styles.toolbar}><p>{visible.length} perfiles en esta vista · la ubicación se muestra de forma aproximada</p><div className={styles.view}><button className={view==='grid'?styles.active:''} onClick={()=>setView('grid')} aria-label="Vista en cuadrícula">▦</button><button className={view==='list'?styles.active:''} onClick={()=>setView('list')} aria-label="Vista en lista">☷</button></div></div>

    {!visible.length?<div className={styles.empty}><h2>No encontramos perfiles con esos filtros</h2><p>Prueba ampliando el distrito, la intención o las señales de confianza.</p><button onClick={resetFilters}>Restablecer filtros</button></div>:<div className={view==='grid'?styles.grid:styles.list}>{visible.map(profile=>{
      const image=profile.imageUrls?.[0]??profile.imageUrl;
      return <article className={styles.card} key={profile.id}>
        <div className={styles.media}>
          <Image src={image} alt={profile.hasPhoto?`Foto de ${profile.name}`:`Perfil de ${profile.name} sin foto`} fill sizes="(max-width:620px) 50vw,(max-width:1000px) 33vw,360px"/>
          <div className={styles.shade}/>
          <div className={styles.status}>{profile.isOnline?<span className={styles.online}>● Activo ahora</span>:null}{profile.isBoosted?<span>⚡ Destacado</span>:null}</div>
          <div className={styles.mediaCopy}><div className={styles.name}><h2>{profile.name}, {profile.age}</h2><TrustMark hasPhoto={Boolean(profile.hasPhoto)} verified={profile.verified} identityVerified={profile.identityVerified}/></div><p>{profile.district} · {profile.distanceBucket}</p></div>
        </div>
        <div className={styles.body}>
          <p className={styles.reason}>🔥 {profile.chemistryScore}% química · {profile.sharedInterestCount} intereses en común</p>
          <p className={styles.bio}>{profile.bio||'Este perfil todavía no añadió una bio.'}</p>
          <div className={styles.chips}>{profile.interests.slice(0,5).map(item=><span key={item}>{item}</span>)}</div>
          <div className={styles.facts}><span>{intentLabels[profile.intent]}</span>{profile.verified||profile.identityVerified?<span>✓ Verificado</span>:null}</div>
          <div className={styles.actions}><Link href={`/perfil/${profile.id}`}>Ver perfil</Link><button disabled={busyId===profile.id} onClick={()=>void decide(profile,'pass')}>Pasar</button><button disabled={busyId===profile.id} onClick={()=>void decide(profile,'like')}>♡ Like</button></div>
        </div>
      </article>;
    })}</div>}

    {hasMore?<div className={styles.more}><button disabled={busyId==='load-more'} onClick={()=>void loadMore()}>{busyId==='load-more'?'Cargando…':'Ver más perfiles'}</button></div>:null}
    {toast?<div className={styles.toast} role="status" aria-live="polite">{toast}</div>:null}
    {match?<div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="match-title"><div className={styles.dialogCard}><p className={styles.eyebrow}>🔥 Conexión mutua</p><h2 id="match-title">¡Hicieron Match!</h2><p>Tú y {match.name} se gustan. Puedes abrir el chat ahora o seguir explorando.</p><div className={styles.dialogActions}><button onClick={continueAfterMatch}>Seguir explorando</button><button onClick={()=>router.push(`/chats/${match.conversationId}`)}>Enviar mensaje</button></div></div></div>:null}
  </section>;
}
