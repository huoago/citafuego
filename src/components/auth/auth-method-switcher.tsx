'use client';

import {useId,useState} from 'react';
import {LoginForm} from '@/components/auth/login-form';
import {RegisterForm} from '@/components/auth/register-form';
import {PhoneAuthForm} from '@/components/auth/phone-auth-form';
import {SocialAuthButtons} from '@/components/auth/social-auth-buttons';
import type {AuthProviderReadiness} from '@/lib/auth/provider-readiness';

type Method='email'|'phone'|'google';
const labels:Record<Method,string>={email:'Email',phone:'Teléfono',google:'Google'};

export function AuthMethodSwitcher({mode,turnstileSiteKey='',readiness}:{mode:'register'|'login';turnstileSiteKey?:string;readiness:AuthProviderReadiness}){
  const[method,setMethod]=useState<Method>('email');
  const base=useId().replace(/:/g,'');
  const methods=(Object.keys(labels) as Method[]);
  const available:Record<Method,boolean>={email:true,phone:readiness.phone,google:readiness.google};
  function moveTab(event:React.KeyboardEvent<HTMLButtonElement>,index:number){
    let direction=0;
    if(event.key==='ArrowRight'||event.key==='ArrowDown')direction=1;
    else if(event.key==='ArrowLeft'||event.key==='ArrowUp')direction=-1;
    else if(event.key==='Home'){
      event.preventDefault();setMethod('email');document.getElementById(`${base}-email-tab`)?.focus();return;
    }else if(event.key==='End')direction=-1;
    else return;
    event.preventDefault();
    for(let offset=1;offset<=methods.length;offset++){
      const candidate:number=event.key==='End'?methods.length-offset:(index+direction*offset+methods.length*2)%methods.length;
      const nextMethod=methods[candidate];
      if(!nextMethod)continue;
      if(available[nextMethod]){setMethod(nextMethod);document.getElementById(`${base}-${nextMethod}-tab`)?.focus();return;}
    }
  }
  const unavailable=methods.filter(item=>item!=='email'&&!available[item]);
  return <div className="authMethodSwitcher">
    <div className="authSegmented" role="tablist" aria-orientation="horizontal" aria-label={mode==='register'?'Método de registro':'Método de acceso'}>
      {methods.map((item,index)=>{
        const enabled=available[item];
        return <button key={item} type="button" role="tab" id={`${base}-${item}-tab`} aria-selected={method===item} aria-controls={`${base}-${item}-panel`} aria-disabled={!enabled} disabled={!enabled} tabIndex={method===item?0:-1} className={method===item?'authSegment active':'authSegment'} onClick={()=>{if(enabled)setMethod(item)}} onKeyDown={event=>moveTab(event,index)} title={enabled?undefined:`${labels[item]} no disponible todavía`}>{labels[item]}{!enabled?<span className="authMethodUnavailable">No disponible</span>:null}</button>;
      })}
    </div>
    {unavailable.length?<p className="authAvailabilityNote" role="status">Email está disponible. {unavailable.map(item=>labels[item]).join(' y ')} {unavailable.length>1?'se habilitarán':'se habilitará'} cuando el proveedor esté listo.</p>:null}
    <div className="authMethodPanel" role="tabpanel" id={`${base}-${method}-panel`} aria-labelledby={`${base}-${method}-tab`}>
      {mode==='register'&&method!=='email'?<p className="authStepIndicator">Paso 1 de 2 · Crea tu cuenta</p>:null}
      {method==='email'?(mode==='register'?<RegisterForm turnstileSiteKey={turnstileSiteKey}/>:<LoginForm/>):null}
      {method==='phone'?<PhoneAuthForm mode={mode} embedded/>:null}
      {method==='google'?<div className="authProviderPanel"><p>{mode==='register'?'Continúa con Google. Después confirmarás que eres mayor de 18 años y tus consentimientos en un segundo y último paso.':'Continúa con la cuenta de Google vinculada a tu perfil.'}</p><SocialAuthButtons mode={mode}/></div>:null}
    </div>
  </div>;
}
