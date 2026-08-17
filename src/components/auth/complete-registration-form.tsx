'use client';

import Link from 'next/link';
import { useState } from 'react';

export function CompleteRegistrationForm(){
  const[birthDate,setBirthDate]=useState('');
  const[terms,setTerms]=useState(false);
  const[privacy,setPrivacy]=useState(false);
  const[sensitive,setSensitive]=useState(false);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  async function submit(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');
    const response=await fetch('/api/auth/complete-registration',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({birthDate,acceptTerms:terms,acceptPrivacy:privacy,acceptSensitive:sensitive})}).catch(()=>null);
    const data=await response?.json().catch(()=>({}))??{};setBusy(false);
    if(!response?.ok){setError(data.error==='adult_only'?'CitaFuego es exclusivamente para mayores de 18 años.':'No pudimos completar el registro. Revisa los datos e inténtalo de nuevo.');return}
    window.location.assign(data.next??'/onboarding');
  }
  return <form className="authForm legalCompletionForm" onSubmit={submit}>
    <label>Fecha de nacimiento<input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} required/></label>
    <p className="muted legalIntro">Antes de entrar necesitamos confirmar que eres mayor de 18 años y registrar tus consentimientos. Estos datos no se muestran en tu perfil.</p>
    <label className="checkRow"><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/><span>Acepto los <Link href="/terminos" target="_blank">Términos de uso</Link>.</span></label>
    <label className="checkRow"><input type="checkbox" checked={privacy} onChange={e=>setPrivacy(e.target.checked)}/><span>Acepto la <Link href="/privacidad" target="_blank">Política de privacidad</Link>.</span></label>
    <label className="checkRow"><input type="checkbox" checked={sensitive} onChange={e=>setSensitive(e.target.checked)}/><span>Consiento el tratamiento de los datos sensibles necesarios para matching, seguridad y verificación.</span></label>
    <button className="ctaButton" type="submit" disabled={busy||!birthDate||!terms||!privacy||!sensitive}>{busy?'Guardando…':'Continuar a mi perfil'}</button>
    {error?<p className="formError" role="alert">{error}</p>:null}
  </form>;
}
