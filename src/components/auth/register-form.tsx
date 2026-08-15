'use client';
import Link from 'next/link';
import { useState } from 'react';

export function RegisterForm() {
  const [loading,setLoading]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(''); setError('');
    const form=new FormData(event.currentTarget);
    const response=await fetch('/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      email:form.get('email'),birthDate:form.get('birthDate'),acceptedTerms:form.get('acceptedTerms')==='on',acceptedPrivacy:form.get('acceptedPrivacy')==='on',acceptedSensitive:form.get('acceptedSensitive')==='on'
    })});
    const data=await response.json().catch(()=>({})); setLoading(false);
    if(!response.ok){setError(data.error==='adult_only'?'CitaFuego es solo para mayores de 18 años.':'No pudimos iniciar el registro. Revisa los datos e inténtalo de nuevo.');return;}
    setMessage(data.message??'Revisa tu correo.');
  }
  return <form className="formStack" onSubmit={submit}>
    <label>Email<input type="email" name="email" autoComplete="email" required /></label>
    <label>Fecha de nacimiento<input type="date" name="birthDate" required /></label>
    <label className="checkboxRow"><input type="checkbox" name="acceptedTerms" required/><span>Acepto los <Link href="/terminos">Términos</Link>.</span></label>
    <label className="checkboxRow"><input type="checkbox" name="acceptedPrivacy" required/><span>He leído la <Link href="/privacidad">Política de Privacidad</Link>.</span></label>
    <label className="checkboxRow"><input type="checkbox" name="acceptedSensitive" required/><span>Consiento el tratamiento necesario de datos sensibles para prestar y proteger el servicio de citas.</span></label>
    <button className="ctaButton fullWidth" disabled={loading}>{loading?'Enviando…':'Continuar con enlace seguro'}</button>
    {message?<p className="formSuccess" role="status">{message}</p>:null}{error?<p className="formError" role="alert">{error}</p>:null}
  </form>;
}
