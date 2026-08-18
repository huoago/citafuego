'use client';

import Link from 'next/link';
import { useState } from 'react';
import type {AuthProviderReadiness} from '@/lib/auth/provider-readiness';

function adultMaxDate(){
  const date=new Date();
  date.setFullYear(date.getFullYear()-18);
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,'0');
  const day=String(date.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function daysInMonth(year:string,month:string){if(!year||!month)return 31;return new Date(Number(year),Number(month),0).getDate()}
function normalizePhone(value:string){return value.replace(/[\s().-]/g,'')}

export function CompleteRegistrationForm({readiness,initialEmail=null,initialPhone=null,emailVerified=false,phoneVerified=false}:{readiness:AuthProviderReadiness;initialEmail?:string|null;initialPhone?:string|null;emailVerified?:boolean;phoneVerified?:boolean}){
  const[birthDay,setBirthDay]=useState('');
  const[birthMonth,setBirthMonth]=useState('');
  const[birthYear,setBirthYear]=useState('');
  const[terms,setTerms]=useState(false);
  const[privacy,setPrivacy]=useState(false);
  const[sensitive,setSensitive]=useState(false);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[email,setEmail]=useState(initialEmail??'');
  const[emailState,setEmailState]=useState(emailVerified?'verified':'idle');
  const[emailMessage,setEmailMessage]=useState(emailVerified?'Correo vinculado y verificado.':'');
  const[phone,setPhone]=useState(initialPhone??'+51 ');
  const[phoneCode,setPhoneCode]=useState('');
  const[phoneState,setPhoneState]=useState(phoneVerified?'verified':'idle');
  const[phoneMessage,setPhoneMessage]=useState(phoneVerified?'Celular vinculado y verificado.':'');
  const maxAdultDate=adultMaxDate();
  const maxAdultYear=Number(maxAdultDate.slice(0,4));
  const yearOptions=Array.from({length:maxAdultYear-1899},(_,i)=>String(maxAdultYear-i));
  const maxDay=daysInMonth(birthYear,birthMonth);
  const candidateBirthDate=birthYear&&birthMonth&&birthDay?`${birthYear}-${birthMonth.padStart(2,'0')}-${birthDay.padStart(2,'0')}`:'';
  const birthDate=candidateBirthDate&&candidateBirthDate<=maxAdultDate?candidateBirthDate:'';

  function changeMonth(value:string){setBirthMonth(value);if(birthDay&&Number(birthDay)>daysInMonth(birthYear,value))setBirthDay('')}
  function changeYear(value:string){setBirthYear(value);if(birthDay&&Number(birthDay)>daysInMonth(value,birthMonth))setBirthDay('')}

  async function bindEmail(){
    if(!readiness.emailRegistration||!email.trim())return;
    setEmailState('busy');setEmailMessage('');
    const response=await fetch('/api/auth/bind/email',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email.trim()})}).catch(()=>null);
    const data=await response?.json().catch(()=>({}))??{};
    if(!response?.ok){setEmailState('idle');setEmailMessage(data.error==='rate_limited'?'Has solicitado demasiados cambios. Inténtalo más tarde.':'No pudimos iniciar la vinculación del correo.');return}
    setEmailState('pending');setEmailMessage(String(data.message??'Revisa tu correo y confirma la dirección.'));
  }

  async function requestPhone(){
    if(!readiness.phone)return;
    const normalized=normalizePhone(phone);
    if(!/^\+[1-9]\d{7,14}$/.test(normalized)){setPhoneMessage('Escribe el número con código de país, por ejemplo +51 999 999 999.');return}
    setPhoneState('busy');setPhoneMessage('');
    const response=await fetch('/api/auth/bind/phone/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:normalized})}).catch(()=>null);
    const data=await response?.json().catch(()=>({}))??{};
    if(!response?.ok){setPhoneState('idle');setPhoneMessage(data.error==='rate_limited'?'Has solicitado demasiados códigos. Inténtalo más tarde.':'No pudimos enviar el SMS ahora.');return}
    setPhone(normalized);setPhoneState('code');setPhoneMessage('Código enviado. Introduce el SMS para confirmar el celular.');
  }

  async function verifyPhone(){
    if(!readiness.phone)return;
    const normalized=normalizePhone(phone);
    if(!/^\d{4,8}$/.test(phoneCode)){setPhoneMessage('Introduce el código recibido por SMS.');return}
    setPhoneState('busy');setPhoneMessage('');
    const response=await fetch('/api/auth/bind/phone/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:normalized,token:phoneCode})}).catch(()=>null);
    if(!response?.ok){setPhoneState('code');setPhoneMessage('El código no es válido o ha caducado.');return}
    setPhoneState('verified');setPhoneMessage('Celular vinculado y verificado.');
  }

  async function submit(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');
    const response=await fetch('/api/auth/complete-registration',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({birthDate,acceptTerms:terms,acceptPrivacy:privacy,acceptSensitive:sensitive})}).catch(()=>null);
    const data=await response?.json().catch(()=>({}))??{};setBusy(false);
    if(!response?.ok){setError(data.error==='adult_only'?'CitaFuego es exclusivamente para mayores de 18 años.':'No pudimos completar el registro. Revisa los datos e inténtalo de nuevo.');return}
    window.location.assign(data.next??'/onboarding');
  }

  return <form className="authForm legalCompletionForm" onSubmit={submit}>
    <fieldset className="birthDateGroup"><legend>Fecha de nacimiento</legend><div className="birthDateSelectGrid"><label>Día<select aria-label="Día" value={birthDay} onChange={e=>setBirthDay(e.target.value)} required><option value="">Día</option>{Array.from({length:maxDay},(_,i)=>String(i+1)).map(day=><option key={day} value={day}>{day}</option>)}</select></label><label>Mes<select aria-label="Mes" value={birthMonth} onChange={e=>changeMonth(e.target.value)} required><option value="">Mes</option>{months.map((month,i)=><option key={month} value={String(i+1)}>{month}</option>)}</select></label><label>Año<select aria-label="Año" value={birthYear} onChange={e=>changeYear(e.target.value)} required><option value="">Año</option>{yearOptions.map(year=><option key={year} value={year}>{year}</option>)}</select></label></div><small className="fieldHelp">Día, mes y año se seleccionan por separado para que también puedas deslizar el mes en el móvil. Solo se usa para validar que tienes 18 años o más.</small></fieldset>
    <fieldset className="legalGroup">
      <legend>Antes de continuar</legend>
      <label className="checkRow"><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)} required/><span>Acepto los <Link href="/terminos" target="_blank" rel="noreferrer">Términos de uso</Link>.</span></label>
      <label className="checkRow"><input type="checkbox" checked={privacy} onChange={e=>setPrivacy(e.target.checked)} required/><span>He leído la <Link href="/privacidad" target="_blank" rel="noreferrer">Política de privacidad</Link>.</span></label>
      <label className="checkRow"><input type="checkbox" checked={sensitive} onChange={e=>setSensitive(e.target.checked)} required/><span>Consiento el tratamiento de datos sensibles necesario para el matching, la seguridad y la verificación.</span></label>
    </fieldset>

    <section className="optionalBindingSection" aria-labelledby="optional-binding-title">
      <div className="optionalBindingHeading"><div><p className="authStepIndicator">Opcional</p><h2 id="optional-binding-title">Vincula tu cuenta</h2></div><span className="optionalBadge">Puedes omitirlo</span></div>
      <p className="fieldHelp">Puedes añadir correo, celular, ambos o ninguno. Vincular al menos uno facilita recuperar tu cuenta más adelante.</p>

      <div className={`bindingCard ${emailState==='verified'?'isVerified':''}`}>
        <div className="bindingCardHeader"><div><strong>Correo electrónico</strong><small>{emailState==='verified'?'Vinculado':'Recuperación y avisos de seguridad'}</small></div><span>{emailState==='verified'?'✓':'✉'}</span></div>
        {emailState!=='verified'?<>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="tu@correo.com" disabled={!readiness.emailRegistration||emailState==='busy'||emailState==='pending'}/>
          {readiness.emailRegistration?<button type="button" className="softButton fullWidth" onClick={()=>void bindEmail()} disabled={emailState==='busy'||emailState==='pending'||!email.trim()}>{emailState==='busy'?'Enviando…':emailState==='pending'?'Confirmación enviada':'Vincular correo'}</button>:<p className="bindingUnavailable">La vinculación por correo aparecerá cuando el envío seguro esté verificado.</p>}
        </>:null}
        {emailMessage?<p className="bindingMessage" role="status">{emailMessage}</p>:null}
      </div>

      <div className={`bindingCard ${phoneState==='verified'?'isVerified':''}`}>
        <div className="bindingCardHeader"><div><strong>Celular</strong><small>{phoneState==='verified'?'Vinculado':'Recuperación y seguridad'}</small></div><span>{phoneState==='verified'?'✓':'☎'}</span></div>
        {phoneState!=='verified'?<>
          <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="+51 999 999 999" disabled={!readiness.phone||phoneState==='busy'||phoneState==='code'}/>
          {readiness.phone&&phoneState!=='code'?<button type="button" className="softButton fullWidth" onClick={()=>void requestPhone()} disabled={phoneState==='busy'}>{phoneState==='busy'?'Enviando…':'Enviar código SMS'}</button>:null}
          {readiness.phone&&phoneState==='code'?<div className="bindingCodeRow"><input aria-label="Código SMS" value={phoneCode} onChange={e=>setPhoneCode(e.target.value.replace(/\D/g,'').slice(0,8))} inputMode="numeric" autoComplete="one-time-code" placeholder="Código SMS"/><button type="button" className="softButton" onClick={()=>void verifyPhone()}>Verificar</button></div>:null}
          {!readiness.phone?<p className="bindingUnavailable">La vinculación por SMS aparecerá cuando el servicio esté verificado.</p>:null}
        </>:null}
        {phoneMessage?<p className="bindingMessage" role="status">{phoneMessage}</p>:null}
      </div>
    </section>

    <button className="ctaButton fullWidth" type="submit" disabled={busy||!birthDate||!terms||!privacy||!sensitive}>{busy?'Guardando…':'Continuar a mi perfil'}</button>
    <p className="authPrivacyHint">Correo y celular son privados y no se muestran en tu perfil público.</p>
    {error?<p className="formError" role="alert">{error}</p>:null}
  </form>;
}
