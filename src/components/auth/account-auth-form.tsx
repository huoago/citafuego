'use client';

import {useState} from 'react';
import {TurnstileField} from '@/components/auth/turnstile-field';

export function AccountAuthForm({mode,turnstileSiteKey=''}:{mode:'register'|'login';turnstileSiteKey?:string}){
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[challengeToken,setChallengeToken]=useState('');
  const[challengeKey,setChallengeKey]=useState(0);

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError('');
    const form=new FormData(event.currentTarget);
    const password=String(form.get('password')??'');
    if(mode==='register'&&password!==String(form.get('confirmPassword')??'')){setBusy(false);setError('Las contraseñas no coinciden.');return;}
    if(turnstileSiteKey&&!challengeToken){setBusy(false);setError('Completa la verificación de seguridad.');return;}
    const body={username:String(form.get('username')??''),password,turnstileToken:challengeToken||undefined};
    const response=await fetch(`/api/auth/account/${mode}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).catch(()=>null);
    const data=await response?.json().catch(()=>({}))??{};
    setBusy(false);
    if(!response?.ok){
      if(turnstileSiteKey){setChallengeToken('');setChallengeKey(key=>key+1)}
      const code=String(data.error??'');
      if(code==='account_taken')setError('Ese nombre de cuenta ya está en uso. Elige otro.');
      else if(code==='invalid_credentials')setError('Cuenta o contraseña incorrectos.');
      else if(code==='rate_limited')setError('Demasiados intentos. Espera un momento antes de volver a probar.');
      else if(code.startsWith('challenge_'))setError('No pudimos validar la verificación de seguridad. Inténtalo de nuevo.');
      else setError(mode==='register'?'No pudimos crear la cuenta ahora. Inténtalo de nuevo.':'No pudimos iniciar sesión ahora. Inténtalo de nuevo.');
      return;
    }
    window.location.assign(typeof data.next==='string'?data.next:(mode==='register'?'/registro/completar':'/onboarding'));
  }

  return <form className="formStack registrationForm accountAuthForm" onSubmit={submit}>
    <div className="authStepHeader"><span className="authStepBadge">{mode==='register'?'1':'✓'}</span><div><strong>{mode==='register'?'Crea tu cuenta':'Entra con tu cuenta'}</strong><small>{mode==='register'?'El correo y el celular se pueden vincular después.':'Usa el nombre de cuenta que elegiste al registrarte.'}</small></div></div>
    <label>Nombre de cuenta<input name="username" autoComplete="username" inputMode="text" minLength={4} maxLength={24} pattern="[A-Za-z0-9][A-Za-z0-9._-]{3,23}" placeholder="ej. fuego_lima" required/><small className="fieldHelp">4–24 caracteres: letras, números, punto, guion o guion bajo.</small></label>
    <label>Contraseña<input type="password" name="password" autoComplete={mode==='register'?'new-password':'current-password'} minLength={mode==='register'?6:1} maxLength={72} required/><small className="fieldHelp">{mode==='register'?'6–72 caracteres. No exigimos mayúsculas, números ni símbolos.':'Tu contraseña nunca se muestra ni se envía por mensaje.'}</small></label>
    {mode==='register'?<label>Repite la contraseña<input type="password" name="confirmPassword" autoComplete="new-password" minLength={6} maxLength={72} required/></label>:null}
    {turnstileSiteKey?<TurnstileField key={challengeKey} siteKey={turnstileSiteKey} onToken={setChallengeToken} action={mode}/>:null}
    <button className="ctaButton fullWidth" disabled={busy||(Boolean(turnstileSiteKey)&&!challengeToken)}>{busy?(mode==='register'?'Creando…':'Entrando…'):(mode==='register'?'Crear cuenta':'Iniciar sesión')}</button>
    {mode==='register'?<p className="authPrivacyHint">Después confirmarás que tienes 18+ y podrás vincular correo o celular de forma opcional.</p>:null}
    {error?<p className="formError" role="alert">{error}</p>:null}
  </form>;
}
