'use client';
import Link from 'next/link';
import { useState } from 'react';
import { TurnstileField } from '@/components/auth/turnstile-field';

export function RegisterForm({turnstileSiteKey=''}:{turnstileSiteKey?:string}) {
  const [loading,setLoading]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState(''); const[challengeToken,setChallengeToken]=useState(''); const[challengeKey,setChallengeKey]=useState(0);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(''); setError('');
    if(turnstileSiteKey&&!challengeToken){setLoading(false);setError('Completa la verificación de seguridad para continuar.');return;}
    const form=new FormData(event.currentTarget);
    const response=await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      email:form.get('email'),birthDate:form.get('birthDate'),acceptedTerms:form.get('acceptedTerms')==='on',acceptedPrivacy:form.get('acceptedPrivacy')==='on',acceptedSensitive:form.get('acceptedSensitive')==='on',turnstileToken:challengeToken||undefined
    })});
    const data=await response.json().catch(()=>({})); setLoading(false);
    if(!response.ok){setChallengeToken('');setChallengeKey(key=>key+1);setError(data.error==='adult_only'?'CitaFuego es solo para mayores de 18 años.':String(data.error??'').startsWith('challenge_')?'No pudimos validar que eres una persona real. Inténtalo de nuevo.':'No pudimos iniciar el registro. Revisa los datos e inténtalo de nuevo.');return;}
    setMessage(data.message??'Revisa tu correo para continuar.');
  }
  return <form className="formStack" onSubmit={submit}>
    <label>Email<input type="email" name="email" autoComplete="email" inputMode="email" placeholder="tu@email.com" required /></label>
    <label>Fecha de nacimiento<input type="date" name="birthDate" autoComplete="bday" required /></label>
    <div className="legalGroup" aria-label="Consentimientos legales">
      <label className="checkboxRow"><input type="checkbox" name="acceptedTerms" required/><span>Acepto los <Link href="/terminos">Términos</Link>.</span></label>
      <label className="checkboxRow"><input type="checkbox" name="acceptedPrivacy" required/><span>He leído la <Link href="/privacidad">Política de Privacidad</Link>.</span></label>
      <label className="checkboxRow"><input type="checkbox" name="acceptedSensitive" required/><span>Consiento el tratamiento necesario de datos sensibles para prestar y proteger el servicio de citas.</span></label>
    </div>
    {turnstileSiteKey?<TurnstileField key={challengeKey} siteKey={turnstileSiteKey} onToken={setChallengeToken}/>:null}
    <button className="ctaButton fullWidth" disabled={loading||(Boolean(turnstileSiteKey)&&!challengeToken)}>{loading?'Preparando tu enlace…':'Continuar con enlace seguro'}</button>
    {message?<p className="formSuccess" role="status" aria-live="polite">{message}</p>:null}{error?<p className="formError" role="alert">{error}</p>:null}
  </form>;
}
