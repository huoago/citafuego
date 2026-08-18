'use client';

import {useId,useState} from 'react';
import {LoginForm} from '@/components/auth/login-form';
import {RegisterForm} from '@/components/auth/register-form';
import {PhoneAuthForm} from '@/components/auth/phone-auth-form';
import {SocialAuthButtons} from '@/components/auth/social-auth-buttons';

type Method='email'|'phone'|'google';
const labels:Record<Method,string>={email:'Email',phone:'Teléfono',google:'Google'};

export function AuthMethodSwitcher({mode,turnstileSiteKey=''}:{mode:'register'|'login';turnstileSiteKey?:string}){
  const[method,setMethod]=useState<Method>('email');
  const base=useId().replace(/:/g,'');
  const methods=(Object.keys(labels) as Method[]);
  function moveTab(event:React.KeyboardEvent<HTMLButtonElement>,index:number){
    let next=index;
    if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%methods.length;
    else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index-1+methods.length)%methods.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=methods.length-1;
    else return;
    event.preventDefault();
    const nextMethod=methods[next];
    setMethod(nextMethod);
    document.getElementById(`${base}-${nextMethod}-tab`)?.focus();
  }
  return <div className="authMethodSwitcher">
    <div className="authSegmented" role="tablist" aria-orientation="horizontal" aria-label={mode==='register'?'Método de registro':'Método de acceso'}>
      {methods.map((item,index)=><button key={item} type="button" role="tab" id={`${base}-${item}-tab`} aria-selected={method===item} aria-controls={`${base}-${item}-panel`} tabIndex={method===item?0:-1} className={method===item?'authSegment active':'authSegment'} onClick={()=>setMethod(item)} onKeyDown={event=>moveTab(event,index)}>{labels[item]}</button>)}
    </div>
    <div className="authMethodPanel" role="tabpanel" id={`${base}-${method}-panel`} aria-labelledby={`${base}-${method}-tab`}>
      {mode==='register'&&method!=='email'?<p className="authStepIndicator">Paso 1 de 2 · Crea tu cuenta</p>:null}
      {method==='email'?(mode==='register'?<RegisterForm turnstileSiteKey={turnstileSiteKey}/>:<LoginForm/>):null}
      {method==='phone'?<PhoneAuthForm mode={mode} embedded/>:null}
      {method==='google'?<div className="authProviderPanel"><p>{mode==='register'?'Continúa con Google. Después confirmarás que eres mayor de 18 años y tus consentimientos en un segundo y último paso.':'Continúa con la cuenta de Google vinculada a tu perfil.'}</p><SocialAuthButtons mode={mode}/></div>:null}
    </div>
  </div>;
}
