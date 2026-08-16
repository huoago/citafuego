'use client';
import { useCallback,useEffect,useMemo,useRef,useState,type ReactNode } from 'react';

type ItemType='profile'|'blog'|'story';
function sessionId(){if(typeof window==='undefined')return 'ssr';const key='cf_rec_session';let value=sessionStorage.getItem(key);if(!value){value=crypto.randomUUID();sessionStorage.setItem(key,value)}return value;}
export function RecommendationFrame({itemType,itemId,creatorId,position,reason,children}:{itemType:ItemType;itemId:string;creatorId:string;position:number;reason:string;children:ReactNode}){
 const ref=useRef<HTMLDivElement|null>(null);const enteredAt=useRef<number|null>(null);const sentImpression=useRef(false);const[hidden,setHidden]=useState(false);const[busy,setBusy]=useState(false);const sid=useMemo(()=>sessionId(),[]);
 const send=useCallback(async(event:'impression'|'click'|'dwell'|'not_interested'|'hide_author',dwellMs?:number)=>{await fetch('/api/recommendations/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event,itemType,itemId,creatorId,dwellMs:dwellMs??null,sessionId:sid,position})}).catch(()=>null)},[creatorId,itemId,itemType,position,sid]);
 useEffect(()=>{const el=ref.current;if(!el)return;const io=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>=.55){if(!sentImpression.current){sentImpression.current=true;void send('impression')}if(enteredAt.current==null)enteredAt.current=Date.now()}else if(enteredAt.current!=null){const elapsed=Math.min(Date.now()-enteredAt.current,3600000);enteredAt.current=null;if(elapsed>=1200)void send('dwell',elapsed)}}},{threshold:[0,.55,1]});io.observe(el);return()=>{io.disconnect();if(enteredAt.current!=null){const elapsed=Math.min(Date.now()-enteredAt.current,3600000);if(elapsed>=1200)void send('dwell',elapsed)}}},[send]);
 if(hidden)return null;
 async function suppress(kind:'not_interested'|'hide_author'){setBusy(true);await send(kind);setBusy(false);setHidden(true)}
 return <div ref={ref} className="recommendationTracked" onClickCapture={()=>void send('click')}>
   <div className="recommendationReason"><span>Para ti</span><small>{reason}</small></div>
   {children}
   <div className="recommendationFeedback"><button type="button" disabled={busy} onClick={(e)=>{e.stopPropagation();void suppress('not_interested')}}>No me interesa</button><button type="button" disabled={busy} onClick={(e)=>{e.stopPropagation();void suppress('hide_author')}}>Ocultar autor</button></div>
 </div>;
}
