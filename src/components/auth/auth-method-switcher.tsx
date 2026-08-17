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
  return <div className="authMethodSwitcher">
    <div className="authSegmented" role="tablist" aria-label={mode==='register'?'Método de registro':'Método de acceso'}>
      {methods.map(item=><button key={item} type="button" role="tab" id={`${base}-${item}-tab`} aria-selected={method===item} aria-controls={`${base}-${item}-panel`} className={method===item?'authSegment active':'authSegment'} onClick={()=>setMethod(item)}>{labels[item]}</button>)}
    </div>
    <div className="authMethodPanel" role="tabpanel" id={`${base}-${method}-panel`} aria-labelledby={`${base}-${method}-tab`}>
      {method==='email'?(mode==='register'?<RegisterForm turnstileSiteKey={turnstileSiteKey}/>:<LoginForm/>):null}
      {method==='phone'?<PhoneAuthForm mode={mode} embedded/>:null}
      {method==='google'?<div className="authProviderPanel"><p>{mode==='register'?'Crea tu cuenta con Google y completa después la validación 18+ y los consentimientos.':'Continúa con la cuenta de Google vinculada a tu perfil.'}</p><SocialAuthButtons mode={mode}/></div>:null}
    </div>
  </div>;
}
