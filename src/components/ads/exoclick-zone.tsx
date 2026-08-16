'use client';
import { useEffect,useRef } from 'react';

declare global{interface Window{AdProvider?:Array<{serve:Record<string,never>}>}}

export function ExoClickZone({zoneId,ageVerified=false}:{zoneId:string;ageVerified?:boolean}){
 const ref=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{
  const numeric=zoneId.replace(/[^0-9]/g,'');if(!numeric||!ref.current)return;
  const serve=()=>{window.AdProvider=window.AdProvider||[];window.AdProvider.push({serve:{}})};
  const existing=document.querySelector<HTMLScriptElement>('script[data-citafuego-exoclick="1"]');
  if(existing){serve();return;}
  const script=document.createElement('script');script.async=true;script.type='application/javascript';script.src='https://a.magsrv.com/ad-provider.js';script.dataset.citafuegoExoclick='1';script.onload=serve;document.body.appendChild(script);
 },[zoneId]);
 const numeric=zoneId.replace(/[^0-9]/g,'');if(!numeric)return null;
 return <div ref={ref} className="exoclickZone"><span className="adDisclosure">Publicidad · ExoClick</span><ins className="eas6a97888e2" data-zoneid={numeric} data-ex_av={ageVerified?'1':'2'} data-block-ad-types={ageVerified?undefined:'101'}/></div>;
}
