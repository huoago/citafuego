'use client';
import { useState } from 'react';

function maskEmail(value:string){
 const [name='',domain='']=value.split('@');
 if(!domain)return value;
 const visible=name.length<=2?name.slice(0,1):name.slice(0,2);
 const hiddenLength=Math.max(2,Math.min(5,name.length-visible.length));
 return `${visible}${'•'.repeat(hiddenLength)}@${domain}`;
}

export function LoginForm(){
 const[loading,setLoading]=useState(false);
 const[error,setError]=useState('');
 const[sentTo,setSentTo]=useState('');

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setLoading(true);setError('');
  try{
   const f=new FormData(e.currentTarget);
   const email=String(f.get('email')??'').trim().toLowerCase();
   const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})});
   await r.json().catch(()=>({}));
   if(!r.ok){
    if(r.status===429)setError('Has solicitado varios enlaces. Espera un momento antes de intentarlo otra vez.');
    else if(r.status===400)setError('Revisa el correo e inténtalo de nuevo.');
    else setError('No pudimos enviar el enlace ahora. Inténtalo de nuevo en unos segundos.');
    return;
   }
   setSentTo(email);
  }catch{setError('No hay conexión. Revisa tu red e inténtalo de nuevo.');}
  finally{setLoading(false);}
 }

 if(sentTo)return <div className="loginSentState" role="status" aria-live="polite">
  <span className="loginSentIcon" aria-hidden="true">✓</span>
  <h2>Revisa tu correo</h2>
  <p>Si existe una cuenta asociada a <strong>{maskEmail(sentTo)}</strong>, recibirás un enlace de acceso de un solo uso.</p>
  <p>Ábrelo en este mismo navegador para completar la sesión.</p>
  <button className="textButton" type="button" onClick={()=>{setSentTo('');setError('')}}>Usar otro correo</button>
 </div>;

 return <form className="formStack" onSubmit={submit}>
  <label>Correo electrónico<input type="email" name="email" autoComplete="email" inputMode="email" placeholder="tu@email.com" aria-describedby="login-email-help" required/></label>
  <p className="loginEmailHint" id="login-email-help">Sin contraseña. Te enviaremos un enlace de acceso de un solo uso.</p>
  <button className="ctaButton fullWidth" disabled={loading}>{loading?'Enviando…':'Enviar enlace de acceso'}</button>
  {error?<p className="formError" role="alert">{error}</p>:null}
 </form>;
}
