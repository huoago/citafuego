'use client';
import { useMemo,useState } from 'react';

type Props={initialNumber:string;initialPublic:boolean};
const compact=(value:string)=>value.trim().replace(/[\s().-]/g,'');
const isValid=(value:string)=>/^\+[1-9][0-9]{7,14}$/.test(compact(value));
const waUrl=(value:string)=>`https://wa.me/${compact(value).replace(/^\+/,'')}`;

export function WhatsAppSettings({initialNumber,initialPublic}:Props){
  const[number,setNumber]=useState(initialNumber);
  const[visibility,setVisibility]=useState<'hidden'|'public'>(initialPublic?'public':'hidden');
  const[status,setStatus]=useState<'idle'|'saving'|'saved'|'error'>('idle');
  const[message,setMessage]=useState('');
  const valid=useMemo(()=>isValid(number),[number]);

  async function save(){
    setStatus('saving');setMessage('');
    try{
      const response=await fetch('/api/profile/whatsapp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({number,visibility})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){setStatus('error');setMessage(data.message??'No pudimos guardar tu WhatsApp.');return}
      setNumber(data.number??'');setVisibility(data.visibility==='public'?'public':'hidden');setStatus('saved');setMessage(data.visibility==='public'?'Tu WhatsApp ya es visible en tu perfil.':'Tu WhatsApp está oculto.');
    }catch{setStatus('error');setMessage('No hay conexión. Inténtalo de nuevo.')}
  }

  return <div className="whatsappSettingsCard">
    <div className="whatsappSettingsHeader"><span className="whatsappIcon" aria-hidden="true">◉</span><div><h2>WhatsApp</h2><p>Decide si otras personas pueden ver tu número y abrir un chat contigo fuera de CitaFuego.</p></div></div>
    <label className="whatsappField"><span>Número de WhatsApp</span><input type="tel" inputMode="tel" autoComplete="tel" value={number} onChange={e=>{setNumber(e.target.value);setStatus('idle')}} placeholder="+51 999 999 999" aria-describedby="whatsapp-help"/></label>
    <p id="whatsapp-help" className="whatsappHelp">Incluye el código de país. Puedes escribir espacios; guardaremos el número en formato internacional.</p>
    <fieldset className="whatsappVisibility"><legend>Visibilidad</legend><button type="button" className={visibility==='hidden'?'active':''} onClick={()=>{setVisibility('hidden');setStatus('idle')}}><strong>Oculto</strong><span>Solo tú puedes verlo.</span></button><button type="button" className={visibility==='public'?'active':''} onClick={()=>{setVisibility('public');setStatus('idle')}} disabled={!valid}><strong>Público</strong><span>Quien pueda abrir tu perfil podrá verlo y contactarte.</span></button></fieldset>
    {visibility==='public'?<div className="whatsappPrivacyWarning">Al hacerlo público, tu número saldrá de CitaFuego cuando alguien abra WhatsApp. Puedes ocultarlo de nuevo en cualquier momento.</div>:null}
    <div className="whatsappSettingsActions"><button type="button" className="ctaButton" onClick={save} disabled={status==='saving'||(Boolean(number)&&!valid)}>{status==='saving'?'Guardando…':'Guardar WhatsApp'}</button>{valid?<a className="ghostButton" href={waUrl(number)} target="_blank" rel="noopener noreferrer">Probar mi enlace</a>:null}</div>
    {message?<p className={status==='error'?'whatsappStatus error':'whatsappStatus success'} role="status">{message}</p>:null}
  </div>;
}
