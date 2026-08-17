'use client';
import Link from 'next/link';
import { useState } from 'react';
import { TurnstileField } from '@/components/auth/turnstile-field';
import { AppIcon } from '@/components/ui/app-icon';

export function RegisterForm({turnstileSiteKey=''}:{turnstileSiteKey?:string}) {
  const [step,setStep]=useState<1|2>(1);
  const [email,setEmail]=useState('');
  const [birthDate,setBirthDate]=useState('');
  const [loading,setLoading]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState(''); const[challengeToken,setChallengeToken]=useState(''); const[challengeKey,setChallengeKey]=useState(0);
  function continueFlow(){setError('');if(!email.trim()||!birthDate){setError('Completa tu email y fecha de nacimiento para continuar.');return;}setStep(2);}
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(''); setError('');
    if(turnstileSiteKey&&!challengeToken){setLoading(false);setError('Completa la verificación de seguridad para continuar.');return;}
    const form=new FormData(event.currentTarget);
    const response=await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      email:form.get('email'),birthDate:form.get('birthDate'),acceptedTerms:form.get('acceptedTerms')==='on',acceptedPrivacy:form.get('acceptedPrivacy')==='on',acceptedSensitive:form.get('acceptedSensitive')==='on',turnstileToken:challengeToken||undefined
    })});
    const data=await response.json().catch(()=>({})); setLoading(false);
    if(!response.ok){setChallengeToken('');setChallengeKey(key=>key+1);setError(data.error==='adult_only'?'CitaFuego es solo para mayores de 18 años.':String(data.error??'').startsWith('challenge_')?'No pudimos validar que eres una persona real. Inténtalo de nuevo.':'No pudimos iniciar el registro. Revisa los datos e inténtalo de nuevo.');return;}
    setMessage(data.message??'Revisa tu correo.');
  }
  return <form className="formStack" onSubmit={submit}>
    <div className="authStepMeta"><span>Crear perfil</span><span>Paso {step} de 2</span></div>
    <div className="authProgress" aria-label={`Paso ${step} de 2`}><span className="active"/><span className={step===2?'active':''}/></div>
    <div hidden={step!==1}>
      <div className="formStack">
        <label>Email<input type="email" name="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        <label>Fecha de nacimiento<input type="date" name="birthDate" value={birthDate} onChange={e=>setBirthDate(e.target.value)} required /></label>
        <div className="authSecurityNote"><AppIcon name="shield" size={20}/><span>Solo personas adultas. Tu fecha de nacimiento se usa para validar la edad y aplicar las reglas de seguridad del servicio.</span></div>
        <button type="button" className="ctaButton fullWidth" onClick={continueFlow}>Continuar</button>
      </div>
    </div>
    <div hidden={step!==2}>
      <div className="formStack">
        <button type="button" className="authBackButton" onClick={()=>setStep(1)}>‹ Volver</button>
        <label className="checkboxRow"><input type="checkbox" name="acceptedTerms" required/><span>Acepto los <Link href="/terminos">Términos</Link>.</span></label>
        <label className="checkboxRow"><input type="checkbox" name="acceptedPrivacy" required/><span>He leído la <Link href="/privacidad">Política de Privacidad</Link>.</span></label>
        <label className="checkboxRow"><input type="checkbox" name="acceptedSensitive" required/><span>Consiento el tratamiento necesario de datos sensibles para prestar y proteger el servicio de citas.</span></label>
        {turnstileSiteKey?<TurnstileField key={challengeKey} siteKey={turnstileSiteKey} onToken={setChallengeToken}/>:null}
        <button className="ctaButton fullWidth" disabled={loading||(Boolean(turnstileSiteKey)&&!challengeToken)}>{loading?'Enviando…':'Continuar con enlace seguro'}</button>
      </div>
    </div>
    {message?<p className="formSuccess" role="status">{message}</p>:null}{error?<p className="formError" role="alert">{error}</p>:null}
  </form>;
}
