'use client';

import {useId,useState} from 'react';
import {LoginForm} from '@/components/auth/login-form';
import {RegisterForm} from '@/components/auth/register-form';
import {PhoneAuthForm} from '@/components/auth/phone-auth-form';
import {SocialAuthButtons} from '@/components/auth/social-auth-buttons';
import type {AuthProviderReadiness} from '@/lib/auth/provider-readiness';

type Method='email'|'phone'|'google';
const labels:Record<Method,string>={email:'Correo',phone:'Teléfono',google:'Google'};

export function AuthMethodSwitcher({mode,turnstileSiteKey='',readiness}:{mode:'register'|'login';turnstileSiteKey?:string;readiness:AuthProviderReadiness}){
  const[method,setMethod]=useState<Method>('email');
  const base=useId().replace(/:/g,'');
  const available:Record<Method,boolean>={email:true,phone:readiness.phone,google:readiness.google};
  const methods=(Object.keys(labels) as Method[]).filter(item=>available[item]);
  const activeMethod=available[method]?method:(methods[0]??'email');

  function moveTab(event:React.KeyboardEvent<HTMLButtonElement>,index:number){
    let targetIndex:number|null=null;
    if(event.key==='ArrowRight'||event.key==='ArrowDown')targetIndex=(index+1)%methods.length;
    else if(event.key==='ArrowLeft'||event.key==='ArrowUp')targetIndex=(index-1+methods.length)%methods.length;
    else if(event.key==='Home')targetIndex=0;
    else if(event.key==='End')targetIndex=methods.length-1;
    else return;
    event.preventDefault();
    const nextMethod=methods[targetIndex];
    if(!nextMethod)return;
    setMethod(nextMethod);
    document.getElementById(`${base}-${nextMethod}-tab`)?.focus();
  }

  return <div className="authMethodSwitcher">
    {methods.length>1?<div className={`authSegmented authSegmented${methods.length}`} role="tablist" aria-orientation="horizontal" aria-label={mode==='register'?'Cómo quieres registrarte':'Cómo quieres entrar'}>
      {methods.map((item,index)=><button key={item} type="button" role="tab" id={`${base}-${item}-tab`} aria-selected={activeMethod===item} aria-controls={`${base}-${item}-panel`} tabIndex={activeMethod===item?0:-1} className={activeMethod===item?'authSegment active':'authSegment'} onClick={()=>setMethod(item)} onKeyDown={event=>moveTab(event,index)}>{labels[item]}</button>)}
    </div>:null}
    <div className="authMethodPanel" role={methods.length>1?'tabpanel':undefined} id={`${base}-${activeMethod}-panel`} aria-labelledby={methods.length>1?`${base}-${activeMethod}-tab`:undefined}>
      {mode==='register'&&activeMethod==='phone'?<p className="authStepIndicator">Registro con teléfono · paso 1 de 2</p>:null}
      {activeMethod==='email'?(mode==='register'?<RegisterForm turnstileSiteKey={turnstileSiteKey}/>:<LoginForm/>):null}
      {activeMethod==='phone'?<PhoneAuthForm mode={mode} embedded/>:null}
      {activeMethod==='google'?<div className="authProviderPanel"><p>{mode==='register'?'Continúa con Google. Después confirmarás que eres mayor de 18 años y tus consentimientos antes de crear tu perfil.':'Continúa con la cuenta de Google vinculada a tu perfil.'}</p><SocialAuthButtons mode={mode}/></div>:null}
    </div>
  </div>;
}
