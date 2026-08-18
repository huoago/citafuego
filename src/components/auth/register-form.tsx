'use client';
import Link from 'next/link';
import { useState } from 'react';
import { TurnstileField } from '@/components/auth/turnstile-field';

function adultMaxDate(){
  const date=new Date();
  date.setFullYear(date.getFullYear()-18);
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,'0');
  const day=String(date.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

export function RegisterForm({turnstileSiteKey=''}:{turnstileSiteKey?:string}) {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [sentEmail,setSentEmail]=useState('');
  const[challengeToken,setChallengeToken]=useState('');
  const[challengeKey,setChallengeKey]=useState(0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);setError('');
    if(turnstileSiteKey&&!challengeToken){setLoading(false);setError('Completa la verificación de seguridad para continuar.');return;}
    const form=new FormData(event.currentTarget);
    const email=String(form.get('email')??'').trim().toLowerCase();
    try{
      const response=await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        email,birthDate:form.get('birthDate'),acceptedTerms:form.get('acceptedTerms')==='on',acceptedPrivacy:form.get('acceptedPrivacy')==='on',acceptedSensitive:form.get('acceptedSensitive')==='on',turnstileToken:challengeToken||undefined
      })});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        setChallengeToken('');setChallengeKey(key=>key+1);
        if(data.error==='adult_only')setError('CitaFuego es solo para mayores de 18 años.');
        else if(String(data.error??'').startsWith('challenge_'))setError('No pudimos validar que eres una persona real. Inténtalo de nuevo.');
        else if(data.error==='registration_rate_limited')setError('Has solicitado varios enlaces. Espera un momento antes de intentarlo de nuevo.');
        else if(data.error==='legal_config_unavailable'||data.error==='registration_unavailable')setError('El registro está temporalmente no disponible. Inténtalo de nuevo en unos minutos.');
        else setError('No pudimos enviar el enlace. Revisa el correo e inténtalo de nuevo.');
        return;
      }
      setSentEmail(email);
    }catch{
      setChallengeToken('');setChallengeKey(key=>key+1);
      setError('No hay conexión. Revisa tu red e inténtalo de nuevo.');
    }finally{
      setLoading(false);
    }
  }

  if(sentEmail)return <div className="authEmailSent" role="status" aria-live="polite">
    <span className="authEmailSentIcon" aria-hidden="true">✓</span>
    <h2>Revisa tu correo</h2>
    <p>Enviamos un enlace de verificación a <strong>{sentEmail}</strong>.</p>
    <p className="authLinkTip">Es de un solo uso. Ábrelo en el mismo navegador donde empezaste el registro. Si el enlace ya fue usado o venció, vuelve aquí y solicita otro.</p>
    <button type="button" className="ghostButton fullWidth" onClick={()=>{setSentEmail('');setError('');setChallengeToken('');setChallengeKey(key=>key+1)}}>Usar otro correo o reenviar</button>
  </div>;

  return <form className="formStack registrationForm" onSubmit={submit}>
    <label>Correo electrónico<input type="email" name="email" autoComplete="email" inputMode="email" placeholder="tu@correo.com" maxLength={254} required /></label>
    <label>Fecha de nacimiento<input type="date" name="birthDate" autoComplete="bday" min="1900-01-01" max={adultMaxDate()} required /><small className="fieldHelp">Solo la usamos para comprobar que tienes 18 años o más. No aparece en tu perfil.</small></label>
    <fieldset className="legalGroup">
      <legend>Antes de continuar</legend>
      <label className="checkboxRow"><input type="checkbox" name="acceptedTerms" required/><span>Acepto los <Link href="/terminos" target="_blank" rel="noreferrer">Términos de uso</Link>.</span></label>
      <label className="checkboxRow"><input type="checkbox" name="acceptedPrivacy" required/><span>He leído la <Link href="/privacidad" target="_blank" rel="noreferrer">Política de privacidad</Link>.</span></label>
      <label className="checkboxRow"><input type="checkbox" name="acceptedSensitive" required/><span>Consiento el tratamiento de datos sensibles necesario para el matching, la seguridad y la verificación.</span></label>
    </fieldset>
    {turnstileSiteKey?<TurnstileField key={challengeKey} siteKey={turnstileSiteKey} onToken={setChallengeToken}/>:null}
    <button className="ctaButton fullWidth" disabled={loading||(Boolean(turnstileSiteKey)&&!challengeToken)}>{loading?'Enviando…':'Enviar enlace de verificación'}</button>
    {error?<p className="formError" role="alert">{error}</p>:null}
  </form>;
}
