'use client';

import { useMemo,useState } from 'react';
import { useRouter } from 'next/navigation';
import { applyUiPreferences } from '@/components/ui-preferences-bootstrap';

export type ProfileModuleLayout={id:string;colSpan:1|2;rowSpan:1|2;visible:boolean};
export type UiPreferences={theme:string;custom_background:string|null;module_layout:ProfileModuleLayout[]};

export const DEFAULT_MODULE_LAYOUT:ProfileModuleLayout[]=[
  {id:'completion',colSpan:2,rowSpan:1,visible:true},
  {id:'social',colSpan:2,rowSpan:1,visible:true},
  {id:'bio',colSpan:2,rowSpan:1,visible:true},
  {id:'handle',colSpan:1,rowSpan:1,visible:true},
  {id:'shortcuts',colSpan:1,rowSpan:2,visible:true},
];

const labels:Record<string,string>={
  completion:'Progreso del perfil',social:'Actividad social',bio:'Biografía',handle:'Nombre @usuario',shortcuts:'Accesos del perfil',
};
const themes=[
  {id:'noche',name:'Noche',sample:'#08080b'},
  {id:'fuego',name:'Fuego',sample:'#160b0d'},
  {id:'oceano',name:'Océano',sample:'#07131a'},
  {id:'bosque',name:'Bosque',sample:'#08140f'},
  {id:'uva',name:'Uva',sample:'#120c19'},
];

function mergeLayout(input:ProfileModuleLayout[]|undefined){
  const seen=new Set<string>();
  const result:ProfileModuleLayout[]=[];
  for(const item of input??[]){
    if(!labels[item.id]||seen.has(item.id))continue;
    seen.add(item.id);
    result.push({id:item.id,colSpan:item.colSpan===2?2:1,rowSpan:item.rowSpan===2?2:1,visible:item.visible!==false});
  }
  for(const item of DEFAULT_MODULE_LAYOUT)if(!seen.has(item.id))result.push(item);
  return result;
}

export function SettingsClient({initial}:{initial:UiPreferences}){
  const router=useRouter();
  const[start,setStart]=useState(initial);
  const[theme,setTheme]=useState(initial.theme||'noche');
  const[customBackground,setCustomBackground]=useState(initial.custom_background||'');
  const[layout,setLayout]=useState(()=>mergeLayout(initial.module_layout));
  const[dragging,setDragging]=useState<string|null>(null);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState('');
  const changed=useMemo(()=>JSON.stringify(start)!==JSON.stringify({theme,custom_background:customBackground||null,module_layout:layout}),[start,theme,customBackground,layout]);

  function move(target:string){
    if(!dragging||dragging===target)return;
    setLayout(current=>{
      const copy=[...current];const from=copy.findIndex(x=>x.id===dragging);const to=copy.findIndex(x=>x.id===target);
      if(from<0||to<0)return current;const[item]=copy.splice(from,1);copy.splice(to,0,item);return copy;
    });
  }
  function patch(id:string,next:Partial<ProfileModuleLayout>){setLayout(current=>current.map(item=>item.id===id?{...item,...next}:item))}

  async function save(){
    setSaving(true);setMessage('');
    const payload={theme,custom_background:customBackground||null,module_layout:layout};
    const response=await fetch('/api/ui/preferences',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({}));
    setSaving(false);
    if(!response.ok){setMessage(data.error||'No pudimos guardar tus preferencias.');return}
    setStart(payload);
    applyUiPreferences(payload);
    window.dispatchEvent(new CustomEvent('citafuego-ui-preferences',{detail:payload}));
    setMessage('Preferencias guardadas.');
    router.refresh();
  }

  return <div className="settingsInteractive">
    <section className="settingsSection personalizationSection">
      <header><div><h2>Apariencia</h2><p>Cambia el ambiente visual de CitaFuego. El texto mantiene contraste legible.</p></div></header>
      <div className="themeChoices" role="radiogroup" aria-label="Tema de fondo">
        {themes.map(item=><button type="button" key={item.id} className={theme===item.id?'active':''} onClick={()=>{setTheme(item.id);applyUiPreferences({theme:item.id,custom_background:customBackground||null})}} aria-pressed={theme===item.id}>
          <span style={{background:item.sample}} aria-hidden="true"/><b>{item.name}</b>
        </button>)}
      </div>
      <label className="customColorControl"><span>Color de fondo personalizado</span><input type="color" value={customBackground||'#08080b'} onChange={e=>{setCustomBackground(e.target.value);applyUiPreferences({theme,custom_background:e.target.value})}}/></label>
      {customBackground?<button type="button" className="ghostButton compactButton" onClick={()=>{setCustomBackground('');applyUiPreferences({theme,custom_background:null})}}>Usar solo el tema</button>:null}
    </section>

    <section className="settingsSection personalizationSection">
      <header><div><h2>Módulos de mi perfil</h2><p>Arrastra para cambiar el orden. También puedes cambiar el tamaño o esconder módulos.</p></div></header>
      <div className="moduleLayoutEditor">
        {layout.map(item=><article key={item.id} draggable onDragStart={()=>setDragging(item.id)} onDragEnd={()=>setDragging(null)} onDragOver={e=>{e.preventDefault();move(item.id)}} onDrop={e=>{e.preventDefault();move(item.id)}} className={`${dragging===item.id?'dragging':''} ${item.visible?'':'isHidden'}`}>
          <div className="moduleDragHandle" title="Arrastrar"><span aria-hidden="true">☷</span><strong>{labels[item.id]}</strong></div>
          <div className="moduleControls">
            <button type="button" aria-pressed={item.colSpan===2} onClick={()=>patch(item.id,{colSpan:item.colSpan===2?1:2})}>{item.colSpan===2?'Ancho':'1 columna'}</button>
            <button type="button" aria-pressed={item.rowSpan===2} onClick={()=>patch(item.id,{rowSpan:item.rowSpan===2?1:2})}>{item.rowSpan===2?'Alto':'Normal'}</button>
            <button type="button" aria-pressed={!item.visible} onClick={()=>patch(item.id,{visible:!item.visible})}>{item.visible?'Ocultar':'Mostrar'}</button>
          </div>
        </article>)}
      </div>
      <button type="button" className="ghostButton compactButton" onClick={()=>setLayout(DEFAULT_MODULE_LAYOUT)}>Restablecer módulos</button>
    </section>

    <div className="settingsSaveBar"><div>{message?<span role="status">{message}</span>:changed?<span>Tienes cambios sin guardar.</span>:<span>Todo guardado.</span>}</div><button type="button" className="ctaButton" disabled={saving||!changed} onClick={()=>void save()}>{saving?'Guardando…':'Guardar cambios'}</button></div>
  </div>;
}
