'use client';
import {useState} from 'react';
import {createClient} from '@/lib/supabase/client';

export function ResetPasswordForm(){
  const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage('');const form=new FormData(event.currentTarget);const password=String(form.get('password')??'');const confirm=String(form.get('confirmPassword')??'');if(password!==confirm){setBusy(false);setMessage('Las contraseñas no coinciden.');return}const s=createClient();const{error}=await s.auth.updateUser({password});setBusy(false);if(error){setMessage('No pudimos actualizar la contraseña. Solicita un nuevo enlace si este ya venció.');return}event.currentTarget.reset();setMessage('Contraseña actualizada. Ya puedes iniciar sesión con tu nombre de cuenta.');}
  return <form className="formStack registrationForm accountAuthForm" onSubmit={submit}><label>Nueva contraseña<input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required/><small className="fieldHelp">10–72 caracteres.</small></label><label>Repite la nueva contraseña<input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={72} required/></label><button className="ctaButton fullWidth" disabled={busy}>{busy?'Actualizando…':'Guardar nueva contraseña'}</button>{message?<p className="muted" role="status">{message}</p>:null}</form>;
}
