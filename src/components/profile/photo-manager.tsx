'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Photo={id:string;status:string;signedUrl:string|null;position:number;isPrimary:boolean};
export function PhotoManager({initial}:{initial:Photo[]}){
 const router=useRouter();const[photos,setPhotos]=useState([...initial].sort((a,b)=>a.position-b.position));const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');
 async function setPrimary(id:string){setBusy(true);const r=await fetch('/api/profile/photos',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action:'primary',photoId:id})});setBusy(false);if(r.ok){setPhotos(p=>p.map(x=>({...x,isPrimary:x.id===id})));setMsg('Foto principal actualizada.');router.refresh()}else setMsg('Solo una foto aprobada puede ser principal.')}
 async function persistOrder(next:Photo[]){setBusy(true);const r=await fetch('/api/profile/photos',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action:'reorder',photoIds:next.map(x=>x.id)})});setBusy(false);if(r.ok){setPhotos(next.map((x,i)=>({...x,position:i})));setMsg('Orden guardado.');router.refresh()}else setMsg('No pudimos cambiar el orden.')}
 function move(index:number,delta:number){const to=index+delta;if(to<0||to>=photos.length)return;const next=[...photos];[next[index],next[to]]=[next[to],next[index]];void persistOrder(next)}
 async function removePhoto(photo:Photo){
   if(!window.confirm('¿Eliminar esta foto de tu perfil? Esta acción no se puede deshacer.'))return;
   setBusy(true);setMsg('');
   try{
     const response=await fetch('/api/profile/photos',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({photoId:photo.id})});
     const data=await response.json().catch(()=>({}));
     if(!response.ok){setMsg(data.message??'No pudimos eliminar la foto.');return}
     const remaining=photos.filter(x=>x.id!==photo.id).map((x,index)=>({...x,position:index}));
     if(photo.isPrimary&&!remaining.some(x=>x.isPrimary)){
       const nextPrimary=remaining.find(x=>x.status==='approved');
       if(nextPrimary)for(const item of remaining)item.isPrimary=item.id===nextPrimary.id;
     }
     setPhotos(remaining);
     setMsg(data.cleanupPending?'Foto retirada del perfil. La limpieza del archivo continuará automáticamente.':'Foto eliminada.');
     router.refresh();
   }catch{setMsg('No hay conexión. Inténtalo de nuevo.')}finally{setBusy(false)}
 }
 async function upload(file:File){if(photos.length>=9)return;setBusy(true);setMsg('');const used=new Set(photos.map(x=>x.position));let position=0;while(used.has(position)&&position<9)position++;const start=await fetch('/api/media/profile-photo/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mimeType:file.type,sizeBytes:file.size,position,isPrimary:photos.length===0})});const d=await start.json().catch(()=>({}));if(!start.ok){setBusy(false);setMsg('No pudimos preparar la foto.');return}const sb=createClient();const{error}=await sb.storage.from('profile-photos').uploadToSignedUrl(d.path,d.token,file,{contentType:file.type});if(error){setBusy(false);setMsg('La subida falló.');return}const done=await fetch('/api/media/profile-photo/complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({intentId:d.intentId})});setBusy(false);setMsg(done.ok?'Foto enviada a revisión. Eliminamos metadatos antes de guardarla.':'No pudimos procesar la foto.');router.refresh()}
 return <div className="photoManager"><div className="photoManagerGrid">{photos.map((photo,index)=><article className="managedPhoto" key={photo.id}>{photo.signedUrl?<div className="managedPhotoMedia"><Image src={photo.signedUrl} alt={`Foto ${index+1}`} fill sizes="220px"/></div>:<div className="managedPhotoMedia placeholder">Sin vista previa</div>}<div className="managedPhotoInfo"><span>{photo.isPrimary?'★ Principal':photo.status==='approved'?'✓ Aprobada':photo.status==='pending'?'En revisión':'Revisar'}</span><div className="photoActions"><button type="button" disabled={busy||index===0} onClick={()=>move(index,-1)} aria-label="Mover foto a la izquierda">←</button><button type="button" disabled={busy||index===photos.length-1} onClick={()=>move(index,1)} aria-label="Mover foto a la derecha">→</button><button type="button" disabled={busy||photo.status!=='approved'||photo.isPrimary} onClick={()=>void setPrimary(photo.id)}>Principal</button><button type="button" className="photoDeleteButton" disabled={busy} onClick={()=>void removePhoto(photo)}>Eliminar</button></div></div></article>)}</div>{photos.length<9?<label className="uploadPhotoButton">＋ Añadir otra foto<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f)}}/></label>:null}{msg?<div className="onboardingNotice" role="status">{msg}</div>:null}<div className="softPanel"><strong>Consejo de calidad</strong><p>Combina rostro claro, cuerpo completo, actividad y contexto. Evita duplicados, capturas de pantalla y fotos con información privada visible.</p></div></div>;
}
