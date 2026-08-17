'use client';
import { useState } from 'react';
import { AppIcon } from '@/components/ui/app-icon';

export function LoginForm(){
 const[loading,setLoading]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('');
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);setError('');setMessage('');const f=new FormData(e.currentTarget);const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:f.get('email')})});const d=await r.json().catch(()=>({}));setLoading(false);if(!r.ok){setError('No pudimos enviar el enlace. Inténtalo de nuevo.');return;}setMessage(d.message??'Si existe una cuenta, recibirás un enlace de acceso.');}
 return <form className="formStack" onSubmit={submit}>
  <label>Email<input type="email" name="email" autoComplete="email" inputMode="email" required/></label>
  <div className="authSecurityNote"><AppIcon name="shield" size={20}/><span>Acceso sin contraseña: te enviaremos un enlace de un solo uso a tu correo.</span></div>
  <button className="ctaButton fullWidth" disabled={loading}>{loading?'Enviando…':'Recibir enlace de acceso'}</button>
  {message?<p className="formSuccess" role="status">{message}</p>:null}{error?<p className="formError" role="alert">{error}</p>:null}
 </form>
}
