'use client';
import { useEffect } from 'react';
export function PresenceHeartbeat(){
 useEffect(()=>{let stopped=false;const touch=()=>{if(!stopped&&document.visibilityState==='visible')void fetch('/api/presence',{method:'POST'}).catch(()=>undefined)};touch();const timer=window.setInterval(touch,60000);document.addEventListener('visibilitychange',touch);return()=>{stopped=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',touch)}},[]);
 return null;
}
