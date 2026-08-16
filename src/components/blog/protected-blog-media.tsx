'use client';

export function ProtectedBlogMedia({src,alt,kind,protectedMode=true}:{src:string;alt:string;kind:'image'|'video';protectedMode?:boolean}){
 if(kind==='video')return <div className={`blogMediaFrame video${protectedMode?' protected':''}`} onContextMenu={protectedMode?e=>e.preventDefault():undefined}>
  <video src={src} controls playsInline preload="metadata" controlsList={protectedMode?'nodownload noremoteplayback':undefined} disablePictureInPicture={protectedMode} onContextMenu={protectedMode?e=>e.preventDefault():undefined}/>
  {protectedMode?<span className="downloadShield" aria-label="Descarga protegida">🔒</span>:null}
 </div>;
 return <div className={`blogMediaFrame${protectedMode?' protected':''}`} onContextMenu={protectedMode?e=>e.preventDefault():undefined}>
  {/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt={alt} draggable={!protectedMode} referrerPolicy="no-referrer" onDragStart={protectedMode?e=>e.preventDefault():undefined}/>{protectedMode?<span className="downloadShield" aria-label="Descarga protegida">🔒</span>:null}
 </div>;
}
