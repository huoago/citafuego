'use client';
import { useState } from 'react';

export function LoginForm(){
 const[loading,setLoading]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setLoading(true);setMessage('');setError('');
  try{
   const f=new FormData(e.currentTarget);
   const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:f.get('email')})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok){setError('No pudimos enviar el enlace. Inténtalo de nuevo en unos segundos.');return;}
   setMessage(d.message??'Si existe una cuenta, recibirás un enlace de acceso.');
  }catch{setError('No hay conexión. Revisa tu red e inténtalo de nuevo.');}
  finally{setLoading(false);}
 }
 return <form className="formStack" onSubmit={submit}>
  <label>Email<input type="email" name="email" autoComplete="email" inputMode="email" placeholder="tu@email.com" required/></label>
  <button className="ctaButton fullWidth" disabled={loading}>{loading?'Enviando enlace…':'Recibir enlace de acceso'}</button>
  {message?<p className="formSuccess" role="status" aria-live="polite">{message}</p>:null}
  {error?<p className="formError" role="alert">{error}</p>:null}
 </form>;
}
