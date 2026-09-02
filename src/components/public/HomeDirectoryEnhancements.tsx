/* eslint-disable @next/next/no-html-link-for-pages */
import styles from '@/app/home.module.css';

const districts=['Lima Metropolitana','Miraflores','Surco','San Borja','Barranco','Lince','La Molina','Jesús María'];

const enhancementScript=String.raw`(()=>{
  const init=()=>{
    const root=document.querySelector('[data-home-directory]');
    if(!root||root.dataset.ready==='true')return;
    root.dataset.ready='true';
    const state={connection:'todos',gender:'todos',district:'Lima Metropolitana',query:'',verifiedOnly:false,onlineOnly:false,distance:'10'};
    const cards=()=>Array.from(document.querySelectorAll('[data-preview-profile]'));
    const grid=document.querySelector('[data-preview-grid]');
    const empty=document.querySelector('[data-preview-empty]');
    const queryInput=document.querySelector('[data-preview-query]');
    const distanceSelect=document.querySelector('[data-preview-distance]');

    const syncActive=(group,value)=>{
      document.querySelectorAll('[data-filter-group="'+group+'"]').forEach((button)=>{
        const activeClass=button.dataset.activeClass;
        if(activeClass)button.classList.toggle(activeClass,button.dataset.filterValue===value);
      });
    };
    const apply=()=>{
      let visible=0;
      const needle=state.query.trim().toLowerCase();
      cards().forEach((card)=>{
        const haystack=(card.dataset.search||'').toLowerCase();
        const show=(state.connection==='todos'||card.dataset.connection===state.connection)
          &&(state.gender==='todos'||card.dataset.gender===state.gender)
          &&(state.district==='Lima Metropolitana'||card.dataset.district===state.district)
          &&(!state.verifiedOnly||card.dataset.verified==='true')
          &&(!state.onlineOnly||card.dataset.online==='true')
          &&(!needle||haystack.includes(needle));
        card.hidden=!show;if(show)visible+=1;
      });
      document.querySelectorAll('[data-distance-label]').forEach((node)=>node.textContent='≤ '+state.distance+' km');
      if(empty)empty.hidden=visible!==0;
    };

    root.querySelectorAll('[data-filter-group]').forEach((button)=>button.addEventListener('click',()=>{
      const group=button.dataset.filterGroup;const value=button.dataset.filterValue;
      if(!group||!value)return;state[group]=value;syncActive(group,value);apply();
    }));
    if(queryInput)queryInput.addEventListener('input',(event)=>{state.query=event.target.value||'';apply();});
    if(distanceSelect)distanceSelect.addEventListener('change',(event)=>{state.distance=event.target.value||'10';apply();});
    root.querySelector('[data-verified-only]')?.addEventListener('change',(event)=>{state.verifiedOnly=event.target.checked;apply();});
    root.querySelector('[data-online-only]')?.addEventListener('change',(event)=>{state.onlineOnly=event.target.checked;apply();});

    root.querySelectorAll('[data-view]').forEach((button)=>button.addEventListener('click',()=>{
      const view=button.dataset.view;if(!grid||!view)return;
      const nextClass=view==='list'?grid.dataset.listClass:grid.dataset.gridClass;
      if(nextClass)grid.className=nextClass;
      root.querySelectorAll('[data-view]').forEach((candidate)=>{
        const activeClass=candidate.dataset.activeClass;
        if(activeClass)candidate.classList.toggle(activeClass,candidate.dataset.view===view);
      });
    }));

    root.querySelector('[data-locate]')?.addEventListener('click',(event)=>{
      const button=event.currentTarget;
      if(!navigator.geolocation){button.lastChild.textContent=' Usar distrito';return;}
      button.lastChild.textContent=' Localizando…';
      navigator.geolocation.getCurrentPosition(()=>button.lastChild.textContent=' Ubicación lista',()=>button.lastChild.textContent=' Usar distrito',{enableHighAccuracy:false,timeout:7000,maximumAge:300000});
    });

    root.querySelector('[data-voice]')?.addEventListener('click',(event)=>{
      const button=event.currentTarget;
      const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!Speech){button.textContent='×';return;}
      const recognition=new Speech();recognition.lang='es-PE';recognition.interimResults=false;recognition.maxAlternatives=1;
      recognition.onstart=()=>button.textContent='●';recognition.onend=()=>button.textContent='◉';recognition.onerror=()=>button.textContent='◉';
      recognition.onresult=(result)=>{const value=String(result.results?.[0]?.[0]?.transcript||'');if(queryInput){queryInput.value=value;state.query=value;apply();}};
      recognition.start();
    });

    document.querySelector('[data-reset-preview]')?.addEventListener('click',()=>{
      Object.assign(state,{connection:'todos',gender:'todos',district:'Lima Metropolitana',query:'',verifiedOnly:false,onlineOnly:false,distance:'10'});
      syncActive('connection','todos');syncActive('gender','todos');syncActive('district','Lima Metropolitana');
      if(queryInput)queryInput.value='';if(distanceSelect)distanceSelect.value='10';
      const verified=root.querySelector('[data-verified-only]');if(verified)verified.checked=false;
      const online=root.querySelector('[data-online-only]');if(online)online.checked=false;
      apply();
    });
    apply();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();`;

export function HomeDirectoryEnhancements(){
  return <div data-home-directory>
    <section className={styles.selectorArea} aria-label="Buscar personas">
      <div className={styles.selectorRow}><strong>Conexión:</strong>{[['todos','Todo'],['citas','Citas'],['amistad','Amistad'],['video','Videollamadas']].map(([value,label],index)=><button type="button" key={value} data-filter-group="connection" data-filter-value={value} data-active-class={styles.activePill} className={index===0?styles.activePill:undefined}>{label}</button>)}</div>
      <div className={styles.selectorRow}><strong>Quiero conocer:</strong>{[['todos','Todos'],['mujer','Mujeres'],['hombre','Hombres']].map(([value,label],index)=><button type="button" key={value} data-filter-group="gender" data-filter-value={value} data-active-class={styles.activePill} className={index===0?styles.activePill:undefined}>{label}</button>)}</div>
      <div className={styles.cityScroller} aria-label="Distritos de Lima">{districts.map((item,index)=><button type="button" key={item} data-filter-group="district" data-filter-value={item} data-active-class={styles.cityActive} className={index===0?styles.cityActive:undefined}>{item}</button>)}<a href="/lima">Ver todos los distritos</a></div>
      <div className={styles.searchRow}>
        <button type="button" className={styles.locateButton} data-locate><span aria-hidden="true">⌖</span><span> Cerca de mí</span></button>
        <label className={styles.searchBox}><span aria-hidden="true">⌕</span><input data-preview-query defaultValue="" placeholder="¿Qué buscas?" aria-label="Buscar en la vista previa"/></label>
        <button type="button" className={styles.iconButton} data-voice aria-label="Búsqueda por voz" title="Búsqueda por voz">◉</button>
        <details className={styles.filterDetails}><summary className={styles.filterButton}>+ Filtros</summary><div className={styles.advancedFilters}>
          <label>Distancia aproximada<select data-preview-distance defaultValue="10"><option value="3">Hasta 3 km</option><option value="5">Hasta 5 km</option><option value="10">Hasta 10 km</option><option value="25">Hasta 25 km</option><option value="50">Hasta 50 km</option></select></label>
          <label className={styles.checkLabel}><input data-verified-only type="checkbox"/> Solo perfiles verificados</label>
          <label className={styles.checkLabel}><input data-online-only type="checkbox"/> Activos ahora</label>
          <span className={styles.filterNote}>En perfiles reales, la distancia se muestra de forma aproximada para proteger la privacidad.</span>
        </div></details>
      </div>
    </section>
    <div className={styles.directoryHeader}>
      <div><p className={styles.eyebrow}>Vista previa · Lima</p><h1>Personas cerca de ti</h1><p>Explora por distrito, intención y señales de confianza. Los perfiles reales aparecen al iniciar sesión.</p></div>
      <div className={styles.viewToggle} aria-label="Cambiar vista"><button type="button" data-view="grid" data-active-class={styles.viewActive} className={styles.viewActive} aria-label="Vista en cuadrícula">▦</button><button type="button" data-view="list" data-active-class={styles.viewActive} aria-label="Vista en lista">☷</button></div>
    </div>
    <script dangerouslySetInnerHTML={{__html:enhancementScript}}/>
  </div>;
}
