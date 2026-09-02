'use client';

import {useState} from 'react';
import {TurnstileField} from '@/components/auth/turnstile-field';

const REGISTRATION_PASSWORD_MIN_LENGTH=6;
const PASSWORD_MAX_LENGTH=72;

export function AccountAuthForm({mode,turnstileSiteKey=''}:{mode:'register'|'login';turnstileSiteKey?:string}){
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[challengeToken,setChallengeToken]=useState('');
  const[challengeKey,setChallengeKey]=useState(0);
  const[showPassword,setShowPassword]=useState(false);
  const[showConfirmPassword,setShowConfirmPassword]=useState(false);

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
      else if(code==='compromised_password')setError('Esa contraseña apareció en filtraciones conocidas. Elige una contraseña distinta y única.');
      else if(code==='password_security_unavailable')setError('La comprobación de seguridad de contraseñas no está disponible ahora. Inténtalo de nuevo.');
      else if(code==='invalid_password'||code==='invalid_payload')setError(`La contraseña debe tener entre ${REGISTRATION_PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`);
      else if(code.startsWith('challenge_'))setError('No pudimos validar la verificación de seguridad. Inténtalo de nuevo.');
      else setError(mode==='register'?'No pudimos crear la cuenta ahora. Revisa los datos e inténtalo de nuevo.':'No pudimos iniciar sesión ahora. Inténtalo de nuevo.');
      return;
    }
    window.location.assign(typeof data.next==='string'?data.next:(mode==='register'?'/registro/completar':'/onboarding'));
  }

  return <form className="formStack registrationForm accountAuthForm" onSubmit={submit}>
    <div className="authStepHeader"><span className="authStepBadge">{mode==='register'?'1':'✓'}</span><div><strong>{mode==='register'?'Crea tu cuenta':'Entra con tu cuenta'}</strong><small>{mode==='register'?'El correo y el celular se pueden vincular después.':'Usa el nombre de cuenta que elegiste al registrarte.'}</small></div></div>
    <label>Nombre de cuenta<input name="username" autoComplete="username" inputMode="text" minLength={4} maxLength={24} pattern="[A-Za-z0-9][A-Za-z0-9._-]{3,23}" placeholder="ej. fuego_lima" required/><small className="fieldHelp">4–24 caracteres: letras, números, punto, guion o guion bajo.</small></label>
    <div className="passwordFieldGroup">
      <label htmlFor="account-password">Contraseña</label>
      <div className="passwordInputWrap">
        <input id="account-password" type={showPassword?'text':'password'} name="password" autoComplete={mode==='register'?'new-password':'current-password'} minLength={mode==='register'?REGISTRATION_PASSWORD_MIN_LENGTH:1} maxLength={PASSWORD_MAX_LENGTH} required/>
        <button type="button" className="passwordVisibilityToggle" aria-pressed={showPassword} aria-controls="account-password" onClick={()=>setShowPassword(value=>!value)}>{showPassword?'Ocultar':'Mostrar'}</button>
      </div>
      <small className="fieldHelp">{mode==='register'?`${REGISTRATION_PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} caracteres. Puedes elegir la longitud dentro de ese rango; rechazamos contraseñas conocidas por filtraciones públicas.`:'Puedes mostrar u ocultar la contraseña antes de iniciar sesión.'}</small>
    </div>
    {mode==='register'?<div className="passwordFieldGroup">
      <label htmlFor="account-confirm-password">Repite la contraseña</label>
      <div className="passwordInputWrap">
        <input id="account-confirm-password" type={showConfirmPassword?'text':'password'} name="confirmPassword" autoComplete="new-password" minLength={REGISTRATION_PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} required/>
        <button type="button" className="passwordVisibilityToggle" aria-pressed={showConfirmPassword} aria-controls="account-confirm-password" onClick={()=>setShowConfirmPassword(value=>!value)}>{showConfirmPassword?'Ocultar':'Mostrar'}</button>
      </div>
    </div>:null}
    {turnstileSiteKey?<TurnstileField key={challengeKey} siteKey={turnstileSiteKey} onToken={setChallengeToken} action={mode}/>:null}
    <button className="ctaButton fullWidth" disabled={busy||(Boolean(turnstileSiteKey)&&!challengeToken)}>{busy?(mode==='register'?'Creando…':'Entrando…'):(mode==='register'?'Crear cuenta':'Iniciar sesión')}</button>
    {mode==='register'?<p className="authPrivacyHint">Después confirmarás que tienes 18+ y podrás vincular correo o celular de forma opcional.</p>:null}
    {error?<p className="formError" role="alert">{error}</p>:null}
  </form>;
}
