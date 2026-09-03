'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

type Flag={key:string;enabled:boolean;config:Record<string,unknown>|null};
type SwitchDef={key:string;label:string;description:string;commercial?:boolean};
const byPath:Record<string,SwitchDef[]>={
 '/admin/ads':[
  {key:'ADS_ENABLED',label:'Publicidad comercial',description:'Interruptor principal de publicidad.',commercial:true},
  {key:'EXOCLICK_ENABLED',label:'ExoClick',description:'Demanda publicitaria externa mediante ExoClick.',commercial:true},
 ],
 '/admin/payments':[
  {key:'PAYMENTS_ENABLED',label:'Cobros comerciales',description:'Interruptor principal de cobros reales.',commercial:true},
  {key:'SEGPAY_ENABLED',label:'Segpay',description:'Procesamiento/payout mediante Segpay.',commercial:true},
 ],
 '/admin/memberships':[
  {key:'MEMBERSHIP_ENABLED',label:'Membresías pagadas',description:'Venta pública de membresías. Las asignaciones manuales administrativas siguen separadas.',commercial:true},
 ],
 '/admin/commercialization':[
  {key:'COMMERCIALIZATION_ENABLED',label:'Operación comercial',description:'Interruptor maestro del centro comercial.',commercial:true},
  {key:'CREATOR_REWARDS_ENABLED',label:'Creator Rewards',description:'Cálculo y operación de recompensas de creadores.',commercial:true},
  {key:'CREATOR_PAYOUTS_ENABLED',label:'Retiros de creadores',description:'Permite la operación de payouts aprobados.',commercial:true},
  {key:'ADVERTISER_SELF_SERVICE_ENABLED',label:'Publicidad autoservicio',description:'Permite que anunciantes preparen campañas.',commercial:true},
  {key:'BRAND_MARKETPLACE_ENABLED',label:'Brand Marketplace',description:'Marketplace de acuerdos entre marcas y creadores.',commercial:true},
  {key:'COMMERCIAL_FRAUD_MONITOR_ENABLED',label:'Monitor antifraude',description:'Supervisión de riesgo comercial y señales de fraude.'},
  {key:'EXOCLICK_ENABLED',label:'ExoClick',description:'Proveedor de demanda publicitaria.',commercial:true},
  {key:'SEGPAY_ENABLED',label:'Segpay',description:'Proveedor de pago y payout.',commercial:true},
 ],
 '/admin/blog-media':[
  {key:'BLOG_MEDIA_ENABLED',label:'Medios del blog',description:'Carga y operación de imágenes/vídeos de publicaciones.'},
 ],
 '/admin/story-media':[
  {key:'STORY_MEDIA_ENABLED',label:'Medios de Stories',description:'Carga y operación de imágenes/vídeos de Stories.'},
 ],
 '/admin/email':[
  {key:'ACCOUNT_LOGIN_ENABLED',label:'Login por cuenta',description:'Usuario/email + contraseña.'},
  {key:'EMAIL_LOGIN_ENABLED',label:'Login por enlace de email',description:'Magic link / OTP por correo.'},
  {key:'EMAIL_REGISTRATION_ENABLED',label:'Registro mediante email',description:'Alta de cuentas por canal email.'},
  {key:'GOOGLE_LOGIN_ENABLED',label:'Login con Google',description:'Botón y flujo OAuth de Google. Requiere credenciales y proveedor Auth configurado.'},
 ],
};

export function AdminContextControls({isSuperAdmin}:{isSuperAdmin:boolean}){
 const pathname=usePathname();
 const defs=useMemo(()=>byPath[pathname]??[],[pathname]);
 const[flags,setFlags]=useState<Record<string,boolean>>({});
 const[loadedPath,setLoadedPath]=useState('');
 const[busy,setBusy]=useState('');const[message,setMessage]=useState('');
 useEffect(()=>{
  if(!isSuperAdmin||!defs.length)return;
  let active=true;
  void createClient().rpc('admin_get_feature_flags').then(({data,error})=>{
   if(!active)return;
   setLoadedPath(pathname);
   if(error){setMessage(`No se pudieron cargar los interruptores: ${error.message}`);return;}
   const next:Record<string,boolean>={};for(const row of (data??[]) as Flag[])next[row.key]=row.enabled;setFlags(next);
  });
  return()=>{active=false};
 },[isSuperAdmin,pathname,defs.length]);
 if(!isSuperAdmin||!defs.length)return null;
 const loading=loadedPath!==pathname;
 async function toggle(def:SwitchDef){const next=!Boolean(flags[def.key]);setBusy(def.key);setMessage('');const{error}=await createClient().rpc('admin_set_feature_flag',{p_key:def.key,p_enabled:next,p_reason:`Cambio manual de interruptor: ${def.key}`,p_confirmation:next&&def.commercial?'ACTIVAR':null});setBusy('');if(error){setMessage(error.message==='commercial_gate_locked'?'Activación bloqueada hasta alcanzar el umbral comercial de usuarios reales.':`No se pudo cambiar ${def.label}: ${error.message}`);return;}setFlags(v=>({...v,[def.key]:next}));setMessage(`${def.label}: ${next?'activado':'desactivado'}.`)}
 return <section className="adminContextControls" aria-label="Interruptores del módulo"><div className="adminSectionHeader"><div><p className="eyebrow">Control operativo</p><h3>Interruptores del módulo</h3><p className="muted">Cada cambio se valida en servidor y queda registrado en auditoría.</p></div>{pathname==='/admin/email'?<Link className="adminButton" href="/admin/integrations">Configurar Google OAuth</Link>:null}</div>{loading?<div className="adminNotice">Cargando interruptores…</div>:<div className="adminSwitchGrid">{defs.map(def=>{const enabled=Boolean(flags[def.key]);return <div className="adminFeatureSwitch" key={def.key}><div><strong>{def.label}</strong><p>{def.description}</p><small><code>{def.key}</code></small></div><button type="button" role="switch" aria-checked={enabled} className={`adminToggle ${enabled?'on':'off'}`} disabled={Boolean(busy)} onClick={()=>void toggle(def)}><span/>{busy===def.key?'…':enabled?'ON':'OFF'}</button></div>})}</div>}{message?<div className="adminNotice" role="status">{message}</div>:null}</section>;
}
