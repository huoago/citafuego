'use client';
import { useState } from 'react';

export function ReferralShare({url}:{url:string}){
  const[message,setMessage]=useState('');
  async function copy(){
    try{await navigator.clipboard.writeText(url);setMessage('Enlace copiado.')}catch{setMessage('Copia el enlace manualmente.')}
  }
  async function share(){
    if(navigator.share){try{await navigator.share({title:'CitaFuego',text:'Únete a CitaFuego y conoce gente real en Lima.',url});return}catch{return}}
    await copy();
  }
  return <div className="referralShareCard"><label><span>Tu enlace de invitación</span><input readOnly value={url} aria-label="Enlace de invitación"/></label><div className="referralShareActions"><button type="button" className="ctaButton" onClick={()=>void share()}>Compartir invitación</button><button type="button" className="ghostButton" onClick={()=>void copy()}>Copiar enlace</button></div>{message?<p className="whatsappStatus success" role="status">{message}</p>:null}</div>;
}
