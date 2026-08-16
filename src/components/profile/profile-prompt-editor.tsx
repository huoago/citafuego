'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Row={slot:number;prompt_key:string;answer:string};
const choices=[['plan_ideal','Mi plan ideal es…'],['me_gana','Me conquistas si…'],['domingo','Un domingo perfecto…'],['viaje','Un viaje que tengo pendiente…'],['obsesion','Ahora mismo me obsesiona…'],['primera_cita','Para una primera cita prefiero…']] as const;
export function ProfilePromptEditor({initial}:{initial:Row[]}){
 const router=useRouter();const[rows,setRows]=useState<Row[]>([1,2,3].map(slot=>initial.find(x=>x.slot===slot)??{slot,prompt_key:choices[slot-1][0],answer:''}));const[busy,setBusy]=useState<number|null>(null);const[msg,setMsg]=useState('');
 function patch(slot:number,key:keyof Row,value:string|number){setRows(current=>current.map(row=>row.slot===slot?{...row,[key]:value}:row))}
 async function save(row:Row){setBusy(row.slot);setMsg('');const r=await fetch('/api/profile/prompts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slot:row.slot,promptKey:row.prompt_key,answer:row.answer})});const d=await r.json().catch(()=>({}));setBusy(null);if(!r.ok){setMsg(d.error==='prompt_moderation_failed'?'Este texto necesita cambios antes de publicarse.':'No pudimos guardar el prompt.');return}setMsg('Prompt guardado.');router.refresh()}
 async function remove(slot:number){setBusy(slot);const r=await fetch('/api/profile/prompts',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({slot})});setBusy(null);if(r.ok){patch(slot,'answer','');setMsg('Prompt eliminado.');router.refresh()}}
 return <div className="promptEditorStack">{rows.map(row=><article className="promptEditorCard" key={row.slot}><span className="promptSlot">{row.slot}</span><select value={row.prompt_key} onChange={e=>patch(row.slot,'prompt_key',e.target.value)}>{choices.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><textarea value={row.answer} onChange={e=>patch(row.slot,'answer',e.target.value)} maxLength={280} placeholder="Escribe algo concreto que invite a responder…"/><div className="editorMeta"><small>{row.answer.length}/280</small><div><button className="ghostButton" type="button" disabled={busy===row.slot||!row.answer} onClick={()=>void remove(row.slot)}>Eliminar</button><button className="ctaButton" type="button" disabled={busy===row.slot||row.answer.trim().length<3} onClick={()=>void save(row)}>Guardar</button></div></div></article>)}{msg?<div className="onboardingNotice" role="status">{msg}</div>:null}</div>;
}
