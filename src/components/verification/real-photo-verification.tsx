'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';

type Challenge={sessionId:string;challenge:string;expiresAt:string};

export function RealPhotoVerification({hasApprovedPhoto}:{hasApprovedPhoto:boolean}){
  const router=useRouter();
  const[challenge,setChallenge]=useState<Challenge|null>(null);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');

  async function start(){
    if(!hasApprovedPhoto){setMessage('Primero necesitas al menos una foto de perfil aprobada para que el equipo pueda compararla con tu selfie privada.');return}
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/verification/start',{method:'POST'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){setMessage('No se pudo iniciar la verificación. Inténtalo de nuevo más tarde.');return}
      setChallenge({sessionId:String(data.sessionId),challenge:String(data.challenge),expiresAt:String(data.expiresAt)});
      setMessage('Haz el gesto indicado y toma una selfie nueva. Esta imagen solo será visible para el equipo autorizado de revisión.');
    }catch{setMessage('No pudimos conectar con el servicio de verificación.')}finally{setBusy(false)}
  }

  async function submit(file:File){
    if(!challenge){setMessage('Primero inicia el reto de verificación.');return}
    setBusy(true);setMessage('');
    try{
      const upload=await fetch('/api/verification/upload',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:challenge.sessionId,mimeType:file.type,sizeBytes:file.size})});
      const intent=await upload.json().catch(()=>({}));
      if(!upload.ok){setChallenge(null);setMessage('El reto expiró o la selfie no es válida. Inicia uno nuevo.');return}
      const supabase=createClient();
      const{error}=await supabase.storage.from('verification-selfies').uploadToSignedUrl(String(intent.path),String(intent.token),file,{contentType:file.type});
      if(error){setMessage('No se pudo subir la selfie privada.');return}
      const complete=await fetch('/api/verification/complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({intentId:intent.intentId,sessionId:challenge.sessionId})});
      setChallenge(null);
      if(!complete.ok){setMessage('No se pudo completar la verificación. Puedes intentarlo de nuevo.');return}
      setMessage('Selfie enviada a revisión privada. No aparecerá en tu perfil, fotos ni álbumes.');
      router.refresh();
    }catch{setMessage('No pudimos conectar con el servicio de verificación.')}finally{setBusy(false)}
  }

  return <div className="formStack">
    {!hasApprovedPhoto?<div className="softPanel"><strong>Falta una foto de perfil aprobada</strong><p>La selfie de verificación se compara de forma privada con una foto de perfil aprobada. La selfie nunca se convierte en foto de perfil ni se añade a un álbum.</p></div>:null}
    {!challenge?<button className="ctaButton" type="button" disabled={busy||!hasApprovedPhoto} onClick={()=>void start()}>{busy?'Preparando…':'Iniciar verificación de foto real'}</button>:<div className="softPanel">
      <strong>Reto de selfie</strong><p>{challenge.challenge}</p><small>El reto caduca automáticamente. La selfie se almacena en un espacio privado separado de tus fotos y álbumes.</small>
      <label className="ghostButton">Tomar / elegir selfie<input hidden type="file" accept="image/jpeg,image/png,image/webp" capture="user" disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)void submit(file)}}/></label>
    </div>}
    {message?<p className="muted" role="status" aria-live="polite">{message}</p>:null}
  </div>;
}
