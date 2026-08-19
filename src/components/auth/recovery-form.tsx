'use client';
import {useState} from 'react';

export function RecoveryForm(){
  const[busy,setBusy]=useState(false);const[done,setDone]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const form=new FormData(event.currentTarget);await fetch('/api/auth/account/recovery',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:String(form.get('username')??'')})}).catch(()=>null);setBusy(false);setDone(true)}
  if(done)return <div className="softPanel"><strong>Solicitud recibida</strong><p>Si la cuenta existe y tiene un correo de recuperación vinculado, enviaremos allí un enlace para restablecer la contraseña.</p></div>;
  return <form className="formStack registrationForm accountAuthForm" onSubmit={submit}><label>Nombre de cuenta<input name="username" autoComplete="username" minLength={4} maxLength={24} pattern="[A-Za-z0-9][A-Za-z0-9._-]{3,23}" required/></label><button className="ctaButton fullWidth" disabled={busy}>{busy?'Enviando…':'Enviar enlace de recuperación'}</button></form>;
}
