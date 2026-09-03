'use client';

import {useId,useState} from 'react';
import {LoginForm} from '@/components/auth/login-form';
import {RegisterForm} from '@/components/auth/register-form';
import {PhoneAuthForm} from '@/components/auth/phone-auth-form';
import {SocialAuthButtons} from '@/components/auth/social-auth-buttons';
import {AccountAuthForm} from '@/components/auth/account-auth-form';
import type {AuthProviderReadiness} from '@/lib/auth/provider-readiness';

type Method='account'|'email'|'phone'|'google';
type LoginNext='/admin'|undefined;
const methodOrder:Method[]=['account','email','phone','google'];
const labels:Record<Method,string>={account:'Cuenta',email:'Correo',phone:'Teléfono',google:'Google'};

export function AuthMethodSwitcher({mode,turnstileSiteKey='',readiness,nextPath}:{mode:'register'|'login';turnstileSiteKey?:string;readiness:AuthProviderReadiness;nextPath?:LoginNext}){
  const defaultMethod:Method=readiness.account?'account':mode==='login'&&readiness.phone?'phone':'email';
  const[method,setMethod]=useState<Method>(defaultMethod);
  const base=useId().replace(/:/g,'');
  const available:Record<Method,boolean>={account:readiness.account,email:mode==='login'||readiness.emailRegistration,phone:readiness.phone,google:readiness.google};
  const methods=methodOrder.filter(item=>available[item]);
  const activeMethod=available[method]?method:methods[0];
  const methodLabel=(item:Method)=>item==='phone'&&mode==='login'?'SMS':labels[item];

  function moveTab(event:React.KeyboardEvent<HTMLButtonElement>,index:number){
    if(!methods.length)return;
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

  if(!activeMethod)return <div className="authInlineAlert authUnavailableState" data-auth-unavailable={mode} role="status"><strong>Acceso temporalmente no disponible.</strong><span>Inténtalo de nuevo más tarde.</span></div>;

  return <div className="authMethodSwitcher">
    {methods.length>1?<div className={`authSegmented authSegmented${methods.length}`} role="tablist" aria-orientation="horizontal" aria-label={mode==='register'?'Cómo quieres registrarte':'Método de acceso'}>
      {methods.map((item,index)=><button key={item} type="button" role="tab" id={`${base}-${item}-tab`} aria-selected={activeMethod===item} aria-controls={`${base}-${item}-panel`} tabIndex={activeMethod===item?0:-1} className={activeMethod===item?'authSegment active':'authSegment'} onClick={()=>setMethod(item)} onKeyDown={event=>moveTab(event,index)}>{methodLabel(item)}</button>)}
    </div>:null}
    <div className="authMethodPanel" role={methods.length>1?'tabpanel':undefined} id={`${base}-${activeMethod}-panel`} aria-labelledby={methods.length>1?`${base}-${activeMethod}-tab`:undefined}>
      {activeMethod==='account'?<AccountAuthForm mode={mode} turnstileSiteKey={turnstileSiteKey} nextPath={nextPath}/>:null}
      {mode==='register'&&activeMethod==='phone'?<p className="authStepIndicator">Registro con teléfono · paso 1 de 2</p>:null}
      {activeMethod==='email'?(mode==='register'?<RegisterForm turnstileSiteKey={turnstileSiteKey}/>:<LoginForm nextPath={nextPath}/>):null}
      {activeMethod==='phone'?<PhoneAuthForm mode={mode} embedded nextPath={nextPath}/>:null}
      {activeMethod==='google'?<div className="authProviderPanel"><p>{mode==='register'?'Continúa con Google. Después confirmarás que eres mayor de 18 años y tus consentimientos antes de crear tu perfil.':'Continúa con la cuenta de Google vinculada a tu perfil.'}</p><SocialAuthButtons mode={mode} nextPath={nextPath}/></div>:null}
    </div>
  </div>;
}
