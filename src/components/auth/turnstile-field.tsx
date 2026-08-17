'use client';
import Script from 'next/script';
import { useCallback,useEffect,useRef } from 'react';

declare global{interface Window{turnstile?:{render:(container:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void;reset:(id:string)=>void}}}

export function TurnstileField({siteKey,onToken}:{siteKey:string;onToken:(token:string)=>void}){
 const host=useRef<HTMLDivElement>(null);const widget=useRef<string|null>(null);
 const renderWidget=useCallback(()=>{if(!host.current||!window.turnstile||widget.current)return;widget.current=window.turnstile.render(host.current,{sitekey:siteKey,theme:'dark',size:'flexible',action:'register',callback:(token:string)=>onToken(token),'expired-callback':()=>onToken(''),'error-callback':()=>onToken('')});},[onToken,siteKey]);
 useEffect(()=>{renderWidget();return()=>{if(widget.current&&window.turnstile)window.turnstile.remove(widget.current);widget.current=null}},[renderWidget]);
 return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={renderWidget}/><div ref={host} className="turnstileHost" aria-label="Verificación anti-bot"/></>;
}
