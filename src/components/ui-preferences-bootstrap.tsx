'use client';

import { useEffect } from 'react';

type UiPreferences={theme?:string;custom_background?:string|null};

function readableText(hex:string){
  const raw=hex.replace('#','');
  if(raw.length!==6)return '#f7f7fb';
  const r=parseInt(raw.slice(0,2),16),g=parseInt(raw.slice(2,4),16),b=parseInt(raw.slice(4,6),16);
  const luminance=(0.2126*r+0.7152*g+0.0722*b)/255;
  return luminance>0.62?'#17171c':'#f7f7fb';
}

export function applyUiPreferences(value:UiPreferences){
  const root=document.documentElement;
  root.dataset.citaTheme=value.theme||'noche';
  if(value.custom_background&&/^#[0-9a-fA-F]{6}$/.test(value.custom_background)){
    root.style.setProperty('--user-app-bg',value.custom_background);
    root.style.setProperty('--user-app-text',readableText(value.custom_background));
    root.dataset.customBackground='true';
  }else{
    root.style.removeProperty('--user-app-bg');
    root.style.removeProperty('--user-app-text');
    delete root.dataset.customBackground;
  }
}

export function UiPreferencesBootstrap(){
  useEffect(()=>{
    let cancelled=false;
    fetch('/api/ui/preferences',{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(data=>{if(!cancelled&&data)applyUiPreferences(data)})
      .catch(()=>undefined);
    const onChange=(event:Event)=>applyUiPreferences((event as CustomEvent<UiPreferences>).detail||{});
    window.addEventListener('citafuego-ui-preferences',onChange);
    return()=>{cancelled=true;window.removeEventListener('citafuego-ui-preferences',onChange)};
  },[]);
  return null;
}
