'use client';

import Link from 'next/link';
import { useState } from 'react';

function adultMaxDate(){
  const date=new Date();
  date.setFullYear(date.getFullYear()-18);
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,'0');
  const day=String(date.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

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
    <label>Fecha de nacimiento<input type="date" value={birthDate} min="1900-01-01" max={adultMaxDate()} autoComplete="bday" onChange={e=>setBirthDate(e.target.value)} required/><small className="fieldHelp">Solo se usa para validar que tienes 18 años o más.</small></label>
    <fieldset className="legalGroup">
      <legend>Antes de continuar</legend>
      <label className="checkRow"><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)} required/><span>Acepto los <Link href="/terminos" target="_blank" rel="noreferrer">Términos de uso</Link>.</span></label>
      <label className="checkRow"><input type="checkbox" checked={privacy} onChange={e=>setPrivacy(e.target.checked)} required/><span>He leído la <Link href="/privacidad" target="_blank" rel="noreferrer">Política de privacidad</Link>.</span></label>
      <label className="checkRow"><input type="checkbox" checked={sensitive} onChange={e=>setSensitive(e.target.checked)} required/><span>Consiento el tratamiento de datos sensibles necesario para el matching, la seguridad y la verificación.</span></label>
    </fieldset>
    <button className="ctaButton fullWidth" type="submit" disabled={busy||!birthDate||!terms||!privacy||!sensitive}>{busy?'Guardando…':'Continuar a mi perfil'}</button>
    {error?<p className="formError" role="alert">{error}</p>:null}
  </form>;
}
