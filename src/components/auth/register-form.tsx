'use client';
import Link from 'next/link';
import { useState } from 'react';
import { TurnstileField } from '@/components/auth/turnstile-field';

type RegistrationPayload={
  email:string;
  birthDate:FormDataEntryValue|null;
  acceptedTerms:boolean;
  acceptedPrivacy:boolean;
  acceptedSensitive:boolean;
  turnstileToken?:string;
};

function adultMaxDate(){
  const date=new Date();
  date.setFullYear(date.getFullYear()-18);
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,'0');
  const day=String(date.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

function maskEmail(email:string){
  const[local='',domain='']=email.split('@');
  if(!domain)return email;
  const visible=local.slice(0,Math.min(2,local.length));
  return `${visible}${local.length>visible.length?'•••':''}@${domain}`;
}

export function RegisterForm({turnstileSiteKey=''}:{turnstileSiteKey?:string}) {
  const [loading,setLoading]=useState(false);
  const [verifying,setVerifying]=useState(false);
  const [error,setError]=useState('');
  const [sentEmail,setSentEmail]=useState('');
  const [code,setCode]=useState('');
  const[challengeToken,setChallengeToken]=useState('');
  const[challengeKey,setChallengeKey]=useState(0);

  function resetChallenge(){
    setChallengeToken('');
    setChallengeKey(key=>key+1);
  }

  function requestError(value:unknown){
    if(value==='adult_only')return 'CitaFuego es solo para mayores de 18 años.';
    if(String(value??'').startsWith('challenge_'))return 'No pudimos validar la verificación de seguridad. Inténtalo de nuevo.';
    if(value==='registration_rate_limited')return 'Has solicitado varios códigos. Espera un momento antes de intentarlo de nuevo.';
    if(value==='email_registration_unavailable'||value==='email_delivery_unavailable')return 'El envío de códigos por correo todavía no está disponible en producción. Inténtalo de nuevo más tarde.';
    if(value==='legal_config_unavailable'||value==='registration_unavailable')return 'No pudimos enviar el código ahora. Inténtalo de nuevo en unos minutos.';
    return 'No pudimos enviar el código. Revisa el correo e inténtalo de nuevo.';
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);setError('');
    if(turnstileSiteKey&&!challengeToken){setLoading(false);setError('Completa la verificación de seguridad para continuar.');return;}
    const form=new FormData(event.currentTarget);
    const email=String(form.get('email')??'').trim().toLowerCase();
    const payload:RegistrationPayload={
      email,birthDate:form.get('birthDate'),acceptedTerms:form.get('acceptedTerms')==='on',acceptedPrivacy:form.get('acceptedPrivacy')==='on',acceptedSensitive:form.get('acceptedSensitive')==='on',turnstileToken:challengeToken||undefined
    };
    try{
      const response=await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        resetChallenge();
        setError(requestError(data.error));
        return;
      }
      setSentEmail(email);
      setCode('');
      setError('');
    }catch{
      resetChallenge();
      setError('No hay conexión. Revisa tu red e inténtalo de nuevo.');
    }finally{
      setLoading(false);
    }
  }

  async function verifyCode(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const normalized=code.replace(/\D/g,'').slice(0,6);
    if(normalized.length!==6){setError('Introduce el código de 6 dígitos que recibiste por correo.');return;}
    setVerifying(true);setError('');
    try{
      const response=await fetch('/api/auth/register/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:sentEmail,code:normalized})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        if(data.error==='verification_rate_limited')setError('Demasiados intentos. Espera un momento antes de volver a probar.');
        else if(data.error==='email_registration_unavailable')setError('La verificación por correo no está disponible temporalmente.');
        else setError('El código no es válido o ha caducado. Solicita uno nuevo.');
        return;
      }
      window.location.assign(typeof data.next==='string'?data.next:'/onboarding');
    }catch{
      setError('No hay conexión. Revisa tu red e inténtalo de nuevo.');
    }finally{
      setVerifying(false);
    }
  }

  if(sentEmail)return <div className="authEmailSent" role="status" aria-live="polite">
    <span className="authEmailSentIcon" aria-hidden="true">✉</span>
    <p className="authStepIndicator">Paso 2 de 2</p>
    <h2>Introduce tu código</h2>
    <p>Enviamos un código de 6 dígitos a <strong>{maskEmail(sentEmail)}</strong>.</p>
    <form className="authCodeForm" onSubmit={verifyCode}>
      <label htmlFor="registration-code">Código de verificación</label>
      <input id="registration-code" className="authCodeInput" value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" aria-describedby="registration-code-help" required autoFocus />
      <small id="registration-code-help" className="fieldHelp">El código es de un solo uso y caduca por seguridad.</small>
      <button className="ctaButton fullWidth" disabled={verifying||code.length!==6}>{verifying?'Verificando…':'Verificar y crear cuenta'}</button>
    </form>
    {error?<p className="formError" role="alert">{error}</p>:null}
    <button type="button" className="textButton authResetButton" onClick={()=>{setSentEmail('');setCode('');setError('');resetChallenge()}}>Usar otro correo o reenviar</button>
  </div>;

  return <form className="formStack registrationForm" onSubmit={submit}>
    <div className="authStepHeader"><span className="authStepBadge">1</span><div><strong>Tu cuenta</strong><small>Te enviaremos un código de 6 dígitos.</small></div></div>
    <label>Correo electrónico<input type="email" name="email" autoComplete="email" inputMode="email" placeholder="tu@correo.com" maxLength={254} required /></label>
    <label>Fecha de nacimiento<input type="date" name="birthDate" autoComplete="bday" min="1900-01-01" max={adultMaxDate()} required /><small className="fieldHelp">Solo la usamos para comprobar que tienes 18 años o más. No aparece en tu perfil.</small></label>
    <fieldset className="legalGroup">
      <legend>Privacidad y consentimiento</legend>
      <label className="checkboxRow"><input type="checkbox" name="acceptedTerms" required/><span>Acepto los <Link href="/terminos" target="_blank" rel="noreferrer">Términos de uso</Link>.</span></label>
      <label className="checkboxRow"><input type="checkbox" name="acceptedPrivacy" required/><span>He leído la <Link href="/privacidad" target="_blank" rel="noreferrer">Política de privacidad</Link>.</span></label>
      <label className="checkboxRow"><input type="checkbox" name="acceptedSensitive" required/><span>Consiento el tratamiento de datos sensibles necesario para el matching, la seguridad y la verificación.</span></label>
    </fieldset>
    {turnstileSiteKey?<TurnstileField key={challengeKey} siteKey={turnstileSiteKey} onToken={setChallengeToken}/>:null}
    <button className="ctaButton fullWidth" disabled={loading||(Boolean(turnstileSiteKey)&&!challengeToken)}>{loading?'Enviando…':'Recibir código por correo'}</button>
    <p className="authPrivacyHint">No necesitas contraseña. Nunca publicamos tu correo ni tu fecha de nacimiento.</p>
    {error?<p className="formError" role="alert">{error}</p>:null}
  </form>;
}
