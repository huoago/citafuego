'use client';

import Link from 'next/link';
import { useEffect,useState } from 'react';

type InstallPromptEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};

export function InstallAppLink(){
  const[prompt,setPrompt]=useState<InstallPromptEvent|null>(null);
  useEffect(()=>{const handler=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPromptEvent)};window.addEventListener('beforeinstallprompt',handler);return()=>window.removeEventListener('beforeinstallprompt',handler)},[]);
  if(!prompt)return <Link className="ghostButton" href="/install">Instalar app</Link>;
  return <button className="ghostButton" type="button" onClick={async()=>{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')setPrompt(null)}}>Instalar app</button>;
}
