'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RelationshipIntent } from '@/lib/types';

type Interest={id:number;label_es:string;category:string};
type Photo={id:string;status:'pending'|'approved'|'rejected'|'removed';signedUrl:string|null;position:number;isPrimary:boolean};
type Profile={display_name?:string;bio?:string;gender_identity?:string;city?:string;district?:string;intent?:RelationshipIntent}|null;
type Preferences={interested_in?:string[];min_age?:number;max_age?:number;max_distance_km?:number;intentions?:RelationshipIntent[]}|null;
type PrivateLocation={latitude:number;longitude:number;accuracyM:number|null};
type Initial={profile:Profile;preferences:Preferences;birthDate:string;consents:Record<string,string>;selectedInterestIds:number[];photos:Photo[];verificationStatus:string;addressLabel:string;location:PrivateLocation|null};
type Challenge={sessionId:string;challenge:string;expiresAt:string};

const genders=[['woman','Mujer'],['man','Hombre'],['nonbinary','No binario']] as const;
const intents:[RelationshipIntent,string][]=[['serious','Relación seria'],['meet_people','Conocer a alguien'],['casual','Algo casual'],['friendship','Amistad'],['open_to_see','Ver qué pasa']];

export function OnboardingFlow({interests,initial,initialStep}:{interests:Interest[];initial:Initial;initialStep?:number}){
  const router=useRouter();
  const[step,setStep]=useState(initialStep??(initial.profile?2:1));
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState('');
  const[selected,setSelected]=useState<number[]>(initial.selectedInterestIds);
  const[want,setWant]=useState<string[]>(initial.preferences?.interested_in??[]);
  const[loc,setLoc]=useState<PrivateLocation|null>(initial.location);
  const[district,setDistrict]=useState(initial.profile?.district??'');
  const[addressLabel,setAddressLabel]=useState(initial.addressLabel??'');
  const[challenge,setChallenge]=useState<Challenge|null>(null);
  const[savedDisplayName,setSavedDisplayName]=useState(initial.profile?.display_name??'');

  const approved=useMemo(()=>initial.photos.filter(p=>p.status==='approved').length,[initial.photos]);
  const hasPhoto=approved>0;
  const verified=initial.verificationStatus==='verified';
  const nameOk=Boolean(savedDisplayName.trim());
  const consentOk=Boolean(initial.consents.terms&&initial.consents.privacy&&initial.consents.sensitive_data);
  const activationReady=nameOk&&consentOk;
  const trustLevel=verified&&hasPhoto?'Confianza avanzada':verified?'Perfil verificado':hasPhoto?'Perfil con fotos':'Perfil estándar';

  function toggle<T>(v:T,a:T[],set:(x:T[])=>void,max=8){set(a.includes(v)?a.filter(x=>x!==v):a.length<max?[...a,v]:a)}

  async function save(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg('');
    const f=new FormData(e.currentTarget);
    const displayName=String(f.get('displayName')??'').trim();
    const r=await fetch('/api/onboarding/profile',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({displayName,bio:f.get('bio')??'',genderIdentity:f.get('gender')??'',city:'Lima',district,addressLabel,intent:f.get('intent'),interestedIn:want,minAge:Number(f.get('minAge')),maxAge:Number(f.get('maxAge')),maxDistanceKm:Number(f.get('distance')),intentions:f.getAll('intentions'),interestIds:selected,location:loc})}).catch(()=>null);
    const out=await r?.json().catch(()=>({}))??{};setBusy(false);
    if(!r?.ok){
      const code=String(out.error??'');
      if(code==='invalid_display_name')setMsg('Escribe un nombre visible para guardar el perfil.');
      else if(code==='invalid_payload'&&Array.isArray(out.fields)&&out.fields.length)setMsg(`Revisa este campo: ${out.fields.join(', ')}.`);
      else setMsg('No pudimos guardar el perfil. Los campos opcionales pueden quedar vacíos; revisa el nombre visible y vuelve a intentar.');
      return;
    }
    setSavedDisplayName(displayName);setMsg('Perfil guardado correctamente. Las fotos y la verificación son opcionales.');setStep(2);router.refresh();
  }

  function location(){
    if(!navigator.geolocation){setMsg('Tu navegador no permite ubicación GPS. Puedes usar distrito/calle o abrir el mapa.');return}
    navigator.geolocation.getCurrentPosition(p=>{setLoc({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracyM:Math.round(p.coords.accuracy)});setMsg('Ubicación privada añadida. Solo mostramos distancia aproximada.')},()=>setMsg('No pudimos leer el GPS. Puedes continuar sin ubicación exacta o abrir el mapa.'),{timeout:8000,maximumAge:300000});
  }

  function openMap(){
    const query=loc?`${loc.latitude},${loc.longitude}`:[addressLabel,district,'Lima','Perú'].filter(Boolean).join(', ');
    if(!query){setMsg('Escribe un distrito o una calle/zona para abrir el mapa.');return}
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,'_blank','noopener,noreferrer');
  }

  async function upload(file:File,pos:number){
    setBusy(true);setMsg('');
    try{
      const start=await fetch('/api/media/profile-photo/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mimeType:file.type,sizeBytes:file.size,position:pos,isPrimary:pos===0})});
      const d=await start.json().catch(()=>({}));
      if(!start.ok){setMsg('No pudimos preparar la foto.');return}
      const sb=createClient();
      const{error}=await sb.storage.from('profile-photos').uploadToSignedUrl(d.path,d.token,file,{contentType:file.type});
      if(error){setMsg('La subida falló.');return}
      const done=await fetch('/api/media/profile-photo/complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({intentId:d.intentId})});
      const out=await done.json().catch(()=>({}));
      setMsg(done.ok?(out.reviewMode==='manual'?'Foto enviada a revisión. Puedes seguir usando CitaFuego mientras se revisa.':'Foto procesada. Si se aprueba, aparecerá tu distintivo de fotos.'):'La foto no pudo procesarse.');
      router.refresh();
    }catch{setMsg('No pudimos conectar con el servicio de fotos. Inténtalo de nuevo.')}finally{setBusy(false)}
  }

  async function startVerification(){
    if(!hasPhoto){setMsg('Para verificarte necesitas al menos una foto aprobada que podamos comparar con tu selfie. La verificación sigue siendo opcional.');setStep(2);return}
    setBusy(true);setMsg('');
    try{
      const r=await fetch('/api/verification/start',{method:'POST'});const d=await r.json().catch(()=>({}));
      if(!r.ok){setMsg('No se pudo iniciar la verificación. Puedes continuar sin verificarte.');return}
      setChallenge({sessionId:d.sessionId,challenge:d.challenge,expiresAt:d.expiresAt});setMsg('Realiza exactamente el gesto indicado antes de tomar la selfie.');
    }catch{setMsg('No pudimos conectar con la verificación. Puedes continuar sin ella.')}finally{setBusy(false)}
  }

  async function submitSelfie(file:File){
    if(!challenge){setMsg('Primero inicia un reto de verificación.');return}
    setBusy(true);setMsg('');
    try{
      const u=await fetch('/api/verification/upload',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:challenge.sessionId,mimeType:file.type,sizeBytes:file.size})});
      const ud=await u.json().catch(()=>({}));
      if(!u.ok){setMsg('El reto expiró o la selfie no es válida. Inicia uno nuevo cuando quieras.');setChallenge(null);return}
      const sb=createClient();const{error}=await sb.storage.from('verification-selfies').uploadToSignedUrl(ud.path,ud.token,file,{contentType:file.type});
      if(error){setMsg('La selfie no pudo subir.');return}
      const c=await fetch('/api/verification/complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({intentId:ud.intentId,sessionId:challenge.sessionId})});
      setChallenge(null);setMsg(c.ok?'Selfie recibida. Cuando se apruebe, tu perfil mostrará el distintivo de verificación.':'No se pudo completar la verificación. Puedes volver a intentarlo más tarde.');router.refresh();
    }catch{setMsg('No pudimos conectar con la verificación. Puedes seguir usando CitaFuego sin verificarte.')}finally{setBusy(false)}
  }

  async function activate(){
    setMsg('');
    if(!nameOk){setMsg('Primero guarda un nombre visible para activar tu perfil.');setStep(1);return}
    if(!consentOk){setMsg('Falta un consentimiento legal vigente. Vuelve a Perfil y revísalo.');setStep(1);return}
    setBusy(true);
    try{
      const r=await fetch('/api/onboarding/activate',{method:'POST'});const d=await r.json().catch(()=>({}));
      if(r.ok&&d.activation?.active){setMsg('Perfil activado. Abriendo Descubrir…');router.replace('/descubrir');router.refresh();return}
      if(!r.ok)setMsg('No pudimos activar tu perfil por un error temporal. Inténtalo de nuevo.');
      else setMsg('Tu cuenta todavía no puede activarse. Comprueba la edad, el nombre, los consentimientos o si existe una restricción de seguridad.');
      router.refresh();
    }catch{setMsg('No pudimos conectar con el servicio de activación. Revisa tu conexión e inténtalo de nuevo.')}finally{setBusy(false)}
  }

  return <main className="onboardingMain">
    <header className="onboardingHeader"><b>🔥 CitaFuego</b><span>Paso {step} de 4</span></header>
    <nav className="stepRail" aria-label="Configuración del perfil"><button onClick={()=>setStep(1)}>Perfil</button><button onClick={()=>setStep(2)}>Fotos</button><button onClick={()=>setStep(3)}>Verificación</button><button onClick={()=>setStep(4)}>Activar</button></nav>
    {msg?<div className="onboardingNotice" role="status" aria-live="polite">{msg}</div>:null}

    {step===1?<form className="onboardingCard formStack trustStepCard" onSubmit={save}>
      <h1>Crea tu perfil</h1><p className="muted">Solo el nombre visible, ser mayor de 18 años y los consentimientos legales son necesarios para activar tu cuenta. El resto es opcional.</p>
      <label>Fecha de nacimiento<input value={initial.birthDate} readOnly aria-describedby="birth-help"/></label><small id="birth-help">Se guarda de forma privada y nunca se muestra a otros usuarios.</small>
      <label>Nombre visible<input name="displayName" defaultValue={initial.profile?.display_name??''} required maxLength={40}/></label>
      <label>Género <small>(opcional)</small><select name="gender" defaultValue={initial.profile?.gender_identity==='unspecified'?'':initial.profile?.gender_identity??''}><option value="">Prefiero no indicarlo</option>{genders.map(g=><option key={g[0]} value={g[0]}>{g[1]}</option>)}</select></label>
      <label>País<input value="Perú" readOnly/></label><label>Ciudad<input value="Lima Metropolitana" readOnly/></label>
      <label>Distrito <small>(opcional)</small><input name="district" value={district} onChange={e=>setDistrict(e.target.value)} maxLength={80}/></label>
      <label>Calle / zona <small>(opcional y privada)</small><input name="addressLabel" value={addressLabel} onChange={e=>setAddressLabel(e.target.value)} maxLength={160} placeholder="Ej. Av. Arequipa, Miraflores"/><small className="fieldHelp">La calle/zona se usa para ayudarte a ubicarte y no se publica en tu perfil.</small></label>
      <div className="locationActionRow"><button type="button" className="softButton" onClick={location}>📍 Usar GPS</button><button type="button" className="softButton" onClick={openMap}>🗺 Abrir en Maps</button></div>
      <label>Qué buscas<select name="intent" defaultValue={initial.profile?.intent??'open_to_see'}>{intents.map(i=><option key={i[0]} value={i[0]}>{i[1]}</option>)}</select></label>
      <label>Bio <small>(opcional)</small><textarea name="bio" maxLength={500} defaultValue={initial.profile?.bio??''} placeholder="Cuéntales algo sobre ti cuando quieras."/></label>
      <fieldset><legend>Me interesa <small>(opcional)</small></legend><div className="choiceGrid">{genders.map(g=><button type="button" key={g[0]} className={want.includes(g[0])?'choice active':'choice'} onClick={()=>toggle(g[0],want,setWant)}>{g[1]}</button>)}</div></fieldset>
      <div className="rangeGrid"><label>Edad min<input type="number" name="minAge" min={18} max={99} defaultValue={initial.preferences?.min_age??21}/></label><label>Edad max<input type="number" name="maxAge" min={18} max={99} defaultValue={initial.preferences?.max_age??40}/></label><label>Km<input type="number" name="distance" min={1} max={250} defaultValue={initial.preferences?.max_distance_km??25}/></label></div>
      <fieldset><legend>Tipo de relación compatible <small>(opcional)</small></legend>{intents.map(i=><label key={i[0]} className="checkboxRow"><input type="checkbox" name="intentions" value={i[0]} defaultChecked={initial.preferences?.intentions?.includes(i[0])??false}/>{i[1]}</label>)}</fieldset>
      <fieldset><legend>Intereses <small>(opcional, hasta 8)</small></legend><div className="choiceGrid">{interests.map(i=><button type="button" key={i.id} className={selected.includes(i.id)?'choice active':'choice'} onClick={()=>toggle(i.id,selected,setSelected)}>{i.label_es}</button>)}</div></fieldset>
      <div className="softPanel"><b>Consentimientos</b><p>{consentOk?'✓ Términos, Privacidad y Datos Sensibles aceptados.':'Falta un consentimiento legal vigente.'}</p></div>
      <button className="ctaButton fullWidth" disabled={busy}>{busy?'Guardando…':'Guardar y continuar'}</button>
    </form>:null}

    {step===2?<section className="onboardingCard trustStepCard">
      <p className="eyebrow">Opcional · confianza</p><h1>Añade fotos reales</h1><p>Las fotos no son obligatorias para usar CitaFuego. Si añades una foto aprobada, tu perfil obtiene un distintivo de fotos; las imágenes se validan, eliminan EXIF/GPS, se convierten a WebP y permanecen privadas.</p>
      <div className="trustInfoStrip"><strong>{approved} foto{approved===1?'':'s'} aprobada{approved===1?'':'s'}</strong><span>{hasPhoto?'Tu distintivo de fotos está disponible.':'Puedes continuar sin fotos.'}</span></div>
      <div className="photoGrid">{[0,1,2,3].map(pos=>{const p=initial.photos.find(x=>x.position===pos);return <label key={pos} className="photoSlot">{p?.signedUrl?<Image src={p.signedUrl} alt="Foto de perfil" fill sizes="160px"/>:<span>＋</span>}<small>{p?.status??(pos===0?'Principal':'Añadir')}</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f,pos)}}/></label>})}</div>
      <div className="optionalStepActions"><button className="softButton fullWidth" onClick={()=>setStep(4)}>Continuar sin fotos</button><button className="ctaButton fullWidth" onClick={()=>setStep(3)}>Ir a verificación</button></div>
    </section>:null}

    {step===3?<section className="onboardingCard trustStepCard">
      <p className="eyebrow">Opcional · confianza</p><h1>Verifica que eres tú</h1><p>La verificación no es obligatoria para usar CitaFuego. Si la completas, aparecerá un distintivo de perfil verificado. Si además tienes fotos aprobadas, obtendrás el distintivo de confianza avanzada.</p>
      <div className="trustInfoStrip"><strong>Estado: {verified?'Verificado':initial.verificationStatus}</strong><span>{verified?'Tu distintivo de verificación está activo.':hasPhoto?'Puedes verificarte ahora o hacerlo más adelante.':'Para verificarte primero necesitas al menos una foto aprobada.'}</span></div>
      {!verified?<> {!challenge?<button className="ctaButton fullWidth" onClick={()=>void startVerification()} disabled={busy}>{hasPhoto?'Iniciar verificación':'Añadir una foto para verificarme'}</button>:<div className="verificationChallenge"><b>Reto:</b><p>{challenge.challenge}</p><small>Vence: {new Date(challenge.expiresAt).toLocaleTimeString('es-PE')}</small><label className="ctaButton fileButton">Tomar selfie ahora<input type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={e=>{const f=e.target.files?.[0];if(f)void submitSelfie(f)}}/></label></div>}</>:null}
      <button className="softButton fullWidth skipTrustButton" onClick={()=>setStep(4)}>{verified?'Continuar':'Continuar sin verificar'}</button>
    </section>:null}

    {step===4?<section className="onboardingCard activationCard trustStepCard">
      <h1>Activa tu perfil</h1><p className="activationIntro">Fotos y verificación son mejoras opcionales de confianza. Para usar CitaFuego solo necesitas cumplir los requisitos básicos de acceso y seguridad.</p>
      <div className="activationChecklist" role="list" aria-label="Estado del perfil">
        <div className="activationRequirement isReady" role="listitem"><span><b>18+</b><small>Requisito obligatorio · edad confirmada</small></span><strong>✓ Listo</strong></div>
        <button type="button" className={`activationRequirement ${nameOk?'isReady':'isPending'}`} role="listitem" onClick={()=>setStep(1)}><span><b>Nombre visible</b><small>Requisito obligatorio</small></span><strong>{nameOk?'✓ Listo':'Pendiente'}</strong></button>
        <div className={`activationRequirement ${consentOk?'isReady':'isPending'}`} role="listitem"><span><b>Consentimientos</b><small>Requisito obligatorio · Términos, Privacidad y Datos Sensibles</small></span><strong>{consentOk?'✓ Listos':'Pendiente'}</strong></div>
        <button type="button" className={`activationRequirement isOptional ${hasPhoto?'hasTrust':'noTrust'}`} role="listitem" onClick={()=>setStep(2)}><span><b>Fotos</b><small>Opcional · mejora confianza y presentación</small></span><strong>{hasPhoto?`${approved} aprobada${approved===1?'':'s'}`:'Opcional'}</strong></button>
        <button type="button" className={`activationRequirement isOptional ${verified?'hasTrust':'noTrust'}`} role="listitem" onClick={()=>setStep(3)}><span><b>Verificación</b><small>Opcional · confirma que eres tú</small></span><strong>{verified?'✓ Verificado':'Opcional'}</strong></button>
      </div>
      <div className="trustLevelCard"><span>Tu distintivo actual</span><strong>{trustLevel}</strong><small>Estándar → Con fotos → Verificado → Confianza avanzada.</small></div>
      <p className={`activationSummary ${activationReady?'isReady':'isPending'}`}>{activationReady?'Todo listo. Puedes entrar ahora; las fotos y la verificación se pueden añadir después.':'Falta completar un requisito básico. Las fotos y la verificación no bloquean la activación.'}</p>
      <button className={`ctaButton fullWidth activationCta ${activationReady?'isReady':'isPending'}`} onClick={()=>void activate()} disabled={busy}>{busy?'Activando…':activationReady?'🔥 Entrar a CitaFuego':'Completar datos obligatorios'}</button>
    </section>:null}
  </main>;
}
