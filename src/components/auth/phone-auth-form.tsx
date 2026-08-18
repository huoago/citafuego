'use client';

import { useState } from 'react';

export function PhoneAuthForm({mode,embedded=false}:{mode:'register'|'login';embedded?:boolean}){
  const[phone,setPhone]=useState('+51');
  const[token,setToken]=useState('');
  const[step,setStep]=useState<'phone'|'code'>('phone');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');

  async function requestCode(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');setMessage('');
    const response=await fetch('/api/auth/phone/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone,mode})}).catch(()=>null);
    const data=await response?.json().catch(()=>({}))??{};setBusy(false);
    if(!response?.ok){setError(data.error==='phone_provider_unavailable'?'El acceso por teléfono no está disponible en este momento. Usa correo.':'Revisa el número e inténtalo de nuevo.');return}
    setStep('code');setMessage(mode==='login'?'Si el número está registrado, recibirás un código por SMS.':'Te enviamos un código por SMS.');
  }

  async function verifyCode(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');
    const response=await fetch('/api/auth/phone/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone,token,mode})}).catch(()=>null);
    const data=await response?.json().catch(()=>({}))??{};setBusy(false);
    if(!response?.ok){setError(data.error==='expired_code'?'El código venció o no es válido. Solicita uno nuevo.':'No pudimos verificar el código.');return}
    window.location.assign(data.next??(mode==='register'?'/registro/completar':'/descubrir'));
  }

  return <div className="phoneAuthBlock">
    {!embedded?<div className="authDivider"><span>o con teléfono</span></div>:null}
    {step==='phone'?<form className="authForm compactAuthForm" onSubmit={requestCode}>
      <label>Número de celular<input inputMode="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+51 999 999 999" aria-describedby="phone-help" required/></label>
      <small id="phone-help">Incluye el código de país. Para Perú usa +51.</small>
      <button className="secondaryButton authMethodButton" disabled={busy} type="submit">{busy?'Enviando…':mode==='register'?'Continuar con teléfono':'Entrar con teléfono'}</button>
    </form>:<form className="authForm compactAuthForm" onSubmit={verifyCode}>
      <p className="authCodeDestination">Código enviado a <strong>{phone}</strong></p>
      <label>Código SMS<input inputMode="numeric" autoComplete="one-time-code" value={token} onChange={e=>setToken(e.target.value.replace(/\D/g,'').slice(0,8))} placeholder="123456" required/></label>
      <button className="ctaButton authMethodButton" disabled={busy||token.length<4} type="submit">{busy?'Verificando…':'Verificar código'}</button>
      <button className="textButton" type="button" onClick={()=>{setStep('phone');setToken('');setMessage('');setError('')}}>Cambiar número</button>
    </form>}
    {message?<p className="formStatus" role="status" aria-live="polite">{message}</p>:null}
    {error?<p className="formError" role="alert">{error}</p>:null}
  </div>;
}
