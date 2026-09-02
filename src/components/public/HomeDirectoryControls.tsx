'use client';

import Link from 'next/link';
import {useMemo,useState} from 'react';
import styles from '@/app/home.module.css';

type DemoProfile={
  id:string;
  name:string;
  age:number;
  district:string;
  gender:'mujer'|'hombre';
  connection:'citas'|'amistad'|'video';
  tagline:string;
  verified:boolean;
  online:boolean;
  media:string[];
};

const DEMO_PROFILES:DemoProfile[]=[
  {id:'p1',name:'Lucía',age:27,district:'Miraflores',gender:'mujer',connection:'citas',tagline:'Café, viajes y conversaciones sin prisa.',verified:true,online:true,media:['2 fotos','audio']},
  {id:'p2',name:'Mateo',age:31,district:'Barranco',gender:'hombre',connection:'amistad',tagline:'Música, fotografía y planes de fin de semana.',verified:true,online:false,media:['3 fotos']},
  {id:'p3',name:'Valeria',age:29,district:'Surco',gender:'mujer',connection:'video',tagline:'Primero conversar, luego vemos qué surge.',verified:true,online:true,media:['video','2 fotos']},
  {id:'p4',name:'Diego',age:33,district:'San Borja',gender:'hombre',connection:'citas',tagline:'Cocina, running y escapadas fuera de Lima.',verified:false,online:true,media:['2 fotos']},
  {id:'p5',name:'Camila',age:26,district:'Lince',gender:'mujer',connection:'amistad',tagline:'Arte, perros y descubrir lugares nuevos.',verified:true,online:false,media:['4 fotos']},
  {id:'p6',name:'Andrés',age:35,district:'La Molina',gender:'hombre',connection:'video',tagline:'Conversaciones claras y conexiones reales.',verified:true,online:false,media:['audio','2 fotos']},
  {id:'p7',name:'Sofía',age:30,district:'Jesús María',gender:'mujer',connection:'citas',tagline:'Libros, gastronomía y una buena primera cita.',verified:true,online:true,media:['3 fotos']},
  {id:'p8',name:'Nicolás',age:28,district:'Miraflores',gender:'hombre',connection:'amistad',tagline:'Viajes, cine y conocer gente nueva.',verified:false,online:false,media:['2 fotos']},
];

const districts=['Lima Metropolitana','Miraflores','Surco','San Borja','Barranco','Lince','La Molina','Jesús María'];

export function HomeDirectoryControls(){
  const[connection,setConnection]=useState<'todos'|'citas'|'amistad'|'video'>('todos');
  const[gender,setGender]=useState<'todos'|'mujer'|'hombre'>('todos');
  const[district,setDistrict]=useState('Lima Metropolitana');
  const[query,setQuery]=useState('');
  const[view,setView]=useState<'grid'|'list'>('grid');
  const[verifiedOnly,setVerifiedOnly]=useState(false);
  const[onlineOnly,setOnlineOnly]=useState(false);
  const[distance,setDistance]=useState('10');
  const[filtersOpen,setFiltersOpen]=useState(false);
  const[locationState,setLocationState]=useState<'idle'|'loading'|'ready'|'denied'>('idle');
  const[voiceState,setVoiceState]=useState<'idle'|'listening'|'unsupported'>('idle');

  const visible=useMemo(()=>DEMO_PROFILES.filter(profile=>{
    if(connection!=='todos'&&profile.connection!==connection)return false;
    if(gender!=='todos'&&profile.gender!==gender)return false;
    if(district!=='Lima Metropolitana'&&profile.district!==district)return false;
    if(verifiedOnly&&!profile.verified)return false;
    if(onlineOnly&&!profile.online)return false;
    const text=`${profile.name} ${profile.district} ${profile.tagline}`.toLowerCase();
    return !query.trim()||text.includes(query.trim().toLowerCase());
  }),[connection,gender,district,verifiedOnly,onlineOnly,query]);

  function locate(){
    if(!navigator.geolocation){setLocationState('denied');return;}
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(()=>setLocationState('ready'),()=>setLocationState('denied'),{enableHighAccuracy:false,timeout:7000,maximumAge:300000});
  }

  function voiceSearch(){
    const w=window as unknown as {SpeechRecognition?:new()=>any;webkitSpeechRecognition?:new()=>any};
    const Speech=w.SpeechRecognition??w.webkitSpeechRecognition;
    if(!Speech){setVoiceState('unsupported');return;}
    const recognition=new Speech();
    recognition.lang='es-PE';
    recognition.interimResults=false;
    recognition.maxAlternatives=1;
    recognition.onstart=()=>setVoiceState('listening');
    recognition.onend=()=>setVoiceState('idle');
    recognition.onerror=()=>setVoiceState('idle');
    recognition.onresult=(event:any)=>setQuery(String(event.results?.[0]?.[0]?.transcript??''));
    recognition.start();
  }

  return <>
    <section className={styles.selectorArea} aria-label="Buscar personas">
      <div className={styles.selectorRow}>
        <strong>Conexión:</strong>
        <button className={connection==='todos'?styles.activePill:''} onClick={()=>setConnection('todos')}>Todo</button>
        <button className={connection==='citas'?styles.activePill:''} onClick={()=>setConnection('citas')}>Citas</button>
        <button className={connection==='amistad'?styles.activePill:''} onClick={()=>setConnection('amistad')}>Amistad</button>
        <button className={connection==='video'?styles.activePill:''} onClick={()=>setConnection('video')}>Videollamadas</button>
      </div>
      <div className={styles.selectorRow}>
        <strong>Quiero conocer:</strong>
        <button className={gender==='todos'?styles.activePill:''} onClick={()=>setGender('todos')}>Todos</button>
        <button className={gender==='mujer'?styles.activePill:''} onClick={()=>setGender('mujer')}>Mujeres</button>
        <button className={gender==='hombre'?styles.activePill:''} onClick={()=>setGender('hombre')}>Hombres</button>
      </div>
      <div className={styles.cityScroller} aria-label="Distritos de Lima">
        {districts.map(item=><button key={item} className={district===item?styles.cityActive:''} onClick={()=>setDistrict(item)}>{item}</button>)}
        <Link href="/lima">Ver todos los distritos</Link>
      </div>

      <div className={styles.searchRow}>
        <button type="button" className={styles.locateButton} onClick={locate}>
          <span aria-hidden="true">⌖</span>
          {locationState==='loading'?'Localizando…':locationState==='ready'?'Ubicación lista':locationState==='denied'?'Usar distrito':'Cerca de mí'}
        </button>
        <label className={styles.searchBox}>
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="¿Qué buscas?" aria-label="Buscar en la vista previa"/>
          {query?<button type="button" onClick={()=>setQuery('')} aria-label="Limpiar búsqueda">×</button>:null}
        </label>
        <button type="button" className={styles.iconButton} onClick={voiceSearch} aria-label="Búsqueda por voz" title={voiceState==='unsupported'?'Tu navegador no admite búsqueda por voz':'Búsqueda por voz'}>{voiceState==='listening'?'●':'◉'}</button>
        <button type="button" className={styles.filterButton} onClick={()=>setFiltersOpen(value=>!value)} aria-expanded={filtersOpen}>+ Filtros</button>
      </div>

      {filtersOpen?<div className={styles.advancedFilters}>
        <label>Distancia aproximada<select value={distance} onChange={event=>setDistance(event.target.value)}><option value="3">Hasta 3 km</option><option value="5">Hasta 5 km</option><option value="10">Hasta 10 km</option><option value="25">Hasta 25 km</option><option value="50">Hasta 50 km</option></select></label>
        <label className={styles.checkLabel}><input type="checkbox" checked={verifiedOnly} onChange={event=>setVerifiedOnly(event.target.checked)}/> Solo perfiles verificados</label>
        <label className={styles.checkLabel}><input type="checkbox" checked={onlineOnly} onChange={event=>setOnlineOnly(event.target.checked)}/> Activos ahora</label>
        <span className={styles.filterNote}>En perfiles reales, la distancia se muestra de forma aproximada para proteger la privacidad.</span>
      </div>:null}
    </section>

    <section className={styles.directorySection}>
      <div className={styles.directoryHeader}>
        <div><p className={styles.eyebrow}>Vista previa · Lima</p><h1>Personas cerca de ti</h1><p>Explora por distrito, intención y señales de confianza. Los perfiles reales aparecen al iniciar sesión.</p></div>
        <div className={styles.viewToggle} aria-label="Cambiar vista"><button className={view==='grid'?styles.viewActive:''} onClick={()=>setView('grid')} aria-label="Vista en cuadrícula">▦</button><button className={view==='list'?styles.viewActive:''} onClick={()=>setView('list')} aria-label="Vista en lista">☷</button></div>
      </div>

      <div className={view==='grid'?styles.profileGrid:styles.profileList}>
        {visible.map((profile,index)=><article className={styles.profilePreview} key={profile.id}>
          <div className={`${styles.previewPhoto} ${styles[`previewTone${(index%4)+1}`]}`}>
            <span className={styles.previewBadge}>Vista previa</span>
            {profile.online?<span className={styles.onlineBadge}>● Activo ahora</span>:null}
            <div className={styles.previewSilhouette} aria-hidden="true"><span>●</span><b>●</b></div>
          </div>
          <div className={styles.previewBody}>
            <div className={styles.previewName}><strong>{profile.name}, {profile.age}</strong>{profile.verified?<span title="Perfil verificado">✓</span>:null}</div>
            <p>{profile.district} · ≤ {distance} km</p>
            <div className={styles.mediaTags}>{profile.media.map(item=><span key={item}>{item}</span>)}</div>
            <p className={styles.tagline}>{profile.tagline}</p>
            <div className={styles.previewActions}><Link href="/descubrir">Ver perfiles</Link><Link href="/registro">Crear perfil</Link></div>
          </div>
        </article>)}
      </div>
      {!visible.length?<div className={styles.noResults}><strong>No hay vistas previas con esos filtros.</strong><button onClick={()=>{setConnection('todos');setGender('todos');setDistrict('Lima Metropolitana');setVerifiedOnly(false);setOnlineOnly(false);setQuery('');}}>Restablecer filtros</button></div>:null}
      <div className={styles.directoryCta}><Link className={styles.primaryCta} href="/registro">Crear mi perfil</Link><Link className={styles.secondaryCta} href="/iniciar-sesion">Ya tengo cuenta</Link></div>
    </section>
  </>;
}
