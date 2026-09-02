'use client';

import Link from 'next/link';
import {useRef,useState} from 'react';
import styles from '@/app/home.module.css';

const districts=['Lima Metropolitana','Miraflores','Surco','San Borja','Barranco','Lince','La Molina','Jesús María'];

type FilterState={connection:string;gender:string;district:string;query:string;verifiedOnly:boolean;onlineOnly:boolean};

function applyPreviewFilters(next:FilterState){
  document.querySelectorAll<HTMLElement>('[data-preview-profile]').forEach(card=>{
    const haystack=(card.dataset.search??'').toLowerCase();
    const matchesConnection=next.connection==='todos'||card.dataset.connection===next.connection;
    const matchesGender=next.gender==='todos'||card.dataset.gender===next.gender;
    const matchesDistrict=next.district==='Lima Metropolitana'||card.dataset.district===next.district;
    const matchesVerified=!next.verifiedOnly||card.dataset.verified==='true';
    const matchesOnline=!next.onlineOnly||card.dataset.online==='true';
    const matchesQuery=!next.query.trim()||haystack.includes(next.query.trim().toLowerCase());
    card.hidden=!(matchesConnection&&matchesGender&&matchesDistrict&&matchesVerified&&matchesOnline&&matchesQuery);
  });
}

export function HomeDirectoryEnhancements(){
  const[filters,setFilters]=useState<FilterState>({connection:'todos',gender:'todos',district:'Lima Metropolitana',query:'',verifiedOnly:false,onlineOnly:false});
  const[locationLabel,setLocationLabel]=useState('Cerca de mí');
  const[voiceLabel,setVoiceLabel]=useState('◉');
  const[view,setView]=useState<'grid'|'list'>('grid');
  const inputRef=useRef<HTMLInputElement>(null);

  function update(patch:Partial<FilterState>){
    const next={...filters,...patch};setFilters(next);applyPreviewFilters(next);
  }
  function locate(){
    if(!navigator.geolocation){setLocationLabel('Usar distrito');return;}
    setLocationLabel('Localizando…');
    navigator.geolocation.getCurrentPosition(()=>setLocationLabel('Ubicación lista'),()=>setLocationLabel('Usar distrito'),{enableHighAccuracy:false,timeout:7000,maximumAge:300000});
  }
  function voiceSearch(){
    const w=window as unknown as {SpeechRecognition?:new()=>any;webkitSpeechRecognition?:new()=>any};
    const Speech=w.SpeechRecognition??w.webkitSpeechRecognition;
    if(!Speech){setVoiceLabel('×');return;}
    const recognition=new Speech();recognition.lang='es-PE';recognition.interimResults=false;recognition.maxAlternatives=1;
    recognition.onstart=()=>setVoiceLabel('●');recognition.onend=()=>setVoiceLabel('◉');recognition.onerror=()=>setVoiceLabel('◉');
    recognition.onresult=(event:any)=>{const value=String(event.results?.[0]?.[0]?.transcript??'');if(inputRef.current)inputRef.current.value=value;update({query:value});};
    recognition.start();
  }
  function changeView(next:'grid'|'list'){
    setView(next);document.querySelector<HTMLElement>('[data-preview-grid]')?.setAttribute('data-view',next);
  }

  return <>
    <section className={styles.selectorArea} aria-label="Buscar personas">
      <div className={styles.selectorRow}><strong>Conexión:</strong>{[['todos','Todo'],['citas','Citas'],['amistad','Amistad'],['video','Videollamadas']].map(([value,label])=><button key={value} className={filters.connection===value?styles.activePill:''} onClick={()=>update({connection:value})}>{label}</button>)}</div>
      <div className={styles.selectorRow}><strong>Quiero conocer:</strong>{[['todos','Todos'],['mujer','Mujeres'],['hombre','Hombres']].map(([value,label])=><button key={value} className={filters.gender===value?styles.activePill:''} onClick={()=>update({gender:value})}>{label}</button>)}</div>
      <div className={styles.cityScroller} aria-label="Distritos de Lima">{districts.map(item=><button key={item} className={filters.district===item?styles.cityActive:''} onClick={()=>update({district:item})}>{item}</button>)}<Link href="/lima">Ver todos los distritos</Link></div>
      <div className={styles.searchRow}>
        <button type="button" className={styles.locateButton} onClick={locate}><span aria-hidden="true">⌖</span> {locationLabel}</button>
        <label className={styles.searchBox}><span aria-hidden="true">⌕</span><input ref={inputRef} defaultValue="" onChange={event=>update({query:event.target.value})} placeholder="¿Qué buscas?" aria-label="Buscar en la vista previa"/></label>
        <button type="button" className={styles.iconButton} onClick={voiceSearch} aria-label="Búsqueda por voz" title="Búsqueda por voz">{voiceLabel}</button>
        <details className={styles.filterDetails}><summary className={styles.filterButton}>+ Filtros</summary><div className={styles.advancedFilters}>
          <label>Distancia aproximada<select defaultValue="10"><option value="3">Hasta 3 km</option><option value="5">Hasta 5 km</option><option value="10">Hasta 10 km</option><option value="25">Hasta 25 km</option><option value="50">Hasta 50 km</option></select></label>
          <label className={styles.checkLabel}><input type="checkbox" checked={filters.verifiedOnly} onChange={event=>update({verifiedOnly:event.target.checked})}/> Solo perfiles verificados</label>
          <label className={styles.checkLabel}><input type="checkbox" checked={filters.onlineOnly} onChange={event=>update({onlineOnly:event.target.checked})}/> Activos ahora</label>
          <span className={styles.filterNote}>En perfiles reales, la distancia se muestra de forma aproximada para proteger la privacidad.</span>
        </div></details>
      </div>
    </section>
    <div className={styles.directoryHeader}>
      <div><p className={styles.eyebrow}>Vista previa · Lima</p><h1>Personas cerca de ti</h1><p>Explora por distrito, intención y señales de confianza. Los perfiles reales aparecen al iniciar sesión.</p></div>
      <div className={styles.viewToggle} aria-label="Cambiar vista"><button className={view==='grid'?styles.viewActive:''} onClick={()=>changeView('grid')} aria-label="Vista en cuadrícula">▦</button><button className={view==='list'?styles.viewActive:''} onClick={()=>changeView('list')} aria-label="Vista en lista">☷</button></div>
    </div>
  </>;
}
