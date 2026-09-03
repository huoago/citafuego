'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';

export function AdminFeatureSwitch({flagKey,enabled,label,description,locked=false}:{flagKey:string;enabled:boolean;label:string;description?:string;locked?:boolean}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function toggle(){
    if(locked||busy)return;
    const next=!enabled;
    setBusy(true);setMessage('');
    const s=createClient();
    const{error}=await s.rpc('admin_set_feature_flag',{p_key:flagKey,p_enabled:next,p_reason:`Cambio operativo desde backoffice: ${flagKey}`,p_confirmation:next?'ACTIVAR':null});
    setBusy(false);
    if(error){setMessage(error.message==='commercial_gate_locked'?'Bloqueado por el umbral comercial de 100 usuarios calificados.':`No se pudo cambiar: ${error.message}`);return;}
    setMessage(next?'Activado.':'Desactivado.');router.refresh();
  }
  return <div className={`adminFeatureSwitch ${locked?'locked':''}`}>
    <div><strong>{label}</strong>{description?<p>{description}</p>:null}<small><code>{flagKey}</code></small></div>
    <div className="adminFeatureSwitchAction"><button type="button" role="switch" aria-checked={enabled} aria-label={`${label}: ${enabled?'activado':'desactivado'}`} className={`adminToggle ${enabled?'on':'off'}`} onClick={()=>void toggle()} disabled={locked||busy}><span/>{busy?'…':enabled?'ON':'OFF'}</button>{message?<small role="status">{message}</small>:null}</div>
  </div>;
}
