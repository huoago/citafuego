'use client';

import Image from 'next/image';
import { useState } from 'react';

type Photo={id:string;url:string|null;position:number;primary:boolean};

export function DirectoryProfileGallery({photos,name,lastActiveLabel}:{photos:Photo[];name:string;lastActiveLabel:string}){
  const available=photos.filter((photo):photo is Photo&{url:string}=>Boolean(photo.url));
  const initial=Math.max(0,available.findIndex(photo=>photo.primary));
  const[selected,setSelected]=useState(initial);
  const current=available[selected]??null;
  return <div className="pkMediaColumn">
    <div className="pkPhotoStage">
      {current?<Image src={current.url} alt={`Foto ${selected+1} de ${name}`} fill priority sizes="(max-width: 900px) 100vw, 58vw" unoptimized/>:<div className="pkPhotoPlaceholder"><strong>{name.slice(0,1).toUpperCase()}</strong><span>Sin fotos públicas</span></div>}
      <div className="pkPhotoOverlay">
        <span className="pkActivity"><i className="pkActivityDot" aria-hidden="true"/>{lastActiveLabel}</span>
        {current?<a className="pkFullscreenLink" href={current.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir foto de ${name} a tamaño completo`}>⛶ Ver foto</a>:null}
      </div>
    </div>
    {available.length>1?<div className="pkThumbs" aria-label={`Galería de ${name}`}>
      {available.map((photo,index)=><button key={photo.id} type="button" className={`pkThumb${index===selected?' active':''}`} onClick={()=>setSelected(index)} aria-label={`Mostrar foto ${index+1} de ${name}`} aria-pressed={index===selected}>
        <Image src={photo.url} alt="" fill sizes="74px" unoptimized/>{photo.primary?<span className="pkThumbPrimary">Principal</span>:null}
      </button>)}
    </div>:null}
  </div>;
}
