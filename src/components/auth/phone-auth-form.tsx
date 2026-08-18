'use client';

import { useState } from 'react';

const normalizePhone=(value:string)=>value.replace(/[\s().-]/g,'');

export function PhoneAuthForm({mode,embedded=false}:{mode:'register'|'login';embedded?:boolean}){
  const[phone,setPhone]=useState('+51');
  const[token,setToken]=useState('');
  const[step,setStep]=useState<'phone'|'code'>('phone');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');

  async function requestCode(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');setMessage('');
    const normalizedPhone=normalizePhone(phone);
    const response=await fetch('/api/auth/phone/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:normalizedPhone,mode})}).catch(()=>null);
    const data=await response?.json().catch(()=>({}))??{};setBusy(false);
    if(!response?.ok){
      if(data.error==='phone_provider_unavailable')setError('El acceso por SMS no está disponible en este momento. Prueba otro método.');
      else if(response?.status===429)setError('Has solicitado varios códigos. Espera un momento antes de intentarlo de nuevo.');
      else setError('Revisa el número e inténtalo de nuevo.');
      return;
    }
    setPhone(normalizedPhone);
    setStep('code');setMessage(mode==='login'?'Si el número está registrado, recibirás un código por SMS.':'Te enviamos un código por SMS.');
  }

  async function verifyCode(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');
    const normalizedPhone=normalizePhone(phone);
    const response=await fetch('/api/auth/phone/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:normalizedPhone,token,mode})}).catch(()=>null);
    const data=await response?.json().catch(()=>({}))??{};setBusy(false);
    if(!response?.ok){setError(data.error==='expired_code'?'El código venció o no es válido. Solicita uno nuevo.':'No pudimos verificar el código.');return}
    window.location.assign(data.next??(mode==='register'?'/registro/completar':'/descubrir'));
  }

  return <div className="phoneAuthBlock">
    {!embedded?<div className="authDivider"><span>o con teléfono</span></div>:null}
    {step==='phone'?<form className="authForm compactAuthForm" onSubmit={requestCode}>
      <label>Número de celular<input inputMode="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+51 999 999 999" aria-describedby="phone-help" required/></label>
      <small id="phone-help">Incluye el código de país. Puedes escribir espacios, guiones o paréntesis.</small>
      <button className="ctaButton authMethodButton" disabled={busy} type="submit">{busy?'Enviando…':mode==='register'?'Continuar':'Enviar código por SMS'}</button>
    </form>:<form className="authForm compactAuthForm" onSubmit={verifyCode}>
      <p className="authCodeDestination">Código enviado a <strong>{phone}</strong></p>
      <label>Código SMS<input inputMode="numeric" autoComplete="one-time-code" value={token} onChange={e=>setToken(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="123456" required/></label>
      <button className="ctaButton authMethodButton" disabled={busy||token.length<4} type="submit">{busy?'Verificando…':'Entrar'}</button>
      <button className="textButton" type="button" onClick={()=>{setStep('phone');setToken('');setMessage('');setError('')}}>Cambiar número</button>
    </form>}
    {message?<p className="formStatus" role="status" aria-live="polite">{message}</p>:null}
    {error?<p className="formError" role="alert">{error}</p>:null}
  </div>;
}
