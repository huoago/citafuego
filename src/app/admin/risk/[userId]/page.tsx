import Link from 'next/link';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/lib/admin/auth';

export const dynamic='force-dynamic';

type RiskReport={id:string;at:string;category:string;priority:string;status:string;reporter_id:string;credibility:number;reciprocal_24h:boolean};
type RiskEvent={id:string;at:string;action:string;human_review:boolean;labels:unknown};
type RiskSanction={id:string;at:string;type:string;reason_code:string;reason_note:string|null;ends_at:string|null;active:boolean};
type RiskData={profile:{id:string;display_name:string;status:string;created_at:string;verification_badge:boolean;identity_verification_badge:boolean};metrics:{reporters_7d:number;severe_reporters_7d:number;weighted_reports_7d:number;weighted_severe_7d:number;blockers_7d:number;shared_device_accounts:number;policy:string};reports:RiskReport[];moderation_events:RiskEvent[];sanctions:RiskSanction[]};

async function decide(formData:FormData){
 'use server';
 const admin=await requireAdmin(['super_admin','trust_safety']);if(!admin)return;
 const userId=String(formData.get('userId')??'');const action=String(formData.get('action')??'');const reason=String(formData.get('reason')??'Revisión manual Trust & Safety').slice(0,1000);
 if(!userId)return;
 if(action==='release')await admin.admin.rpc('admin_release_safety_hold',{p_user:userId,p_reason:reason});
 if(action==='warning')await admin.admin.rpc('admin_apply_sanction',{p_user:userId,p_type:'warning',p_reason_code:'manual_safety_review',p_reason_note:reason,p_hours:null});
 if(action==='suspend')await admin.admin.rpc('admin_apply_sanction',{p_user:userId,p_type:'suspension',p_reason_code:'manual_safety_review',p_reason_note:reason,p_hours:72});
 if(action==='ban')await admin.admin.rpc('admin_apply_sanction',{p_user:userId,p_type:'ban',p_reason_code:'manual_safety_review',p_reason_note:reason,p_hours:null});
 revalidatePath(`/admin/risk/${userId}`);revalidatePath('/admin/reports');
}

export default async function RiskTimeline({params}:{params:Promise<{userId:string}>}){
 const admin=await requireAdmin(['super_admin','trust_safety']);if(!admin)return null;const{userId}=await params;
 const{data,error}=await admin.admin.rpc('admin_get_user_risk_timeline',{p_user:userId});
 if(error||!data)return <section><Link href="/admin/reports">← Reportes</Link><h2>Risk Timeline</h2><p>No se pudo cargar la evaluación de riesgo.</p></section>;
 const risk=data as RiskData;const m=risk.metrics;const p=risk.profile;
 return <section className="riskAdminPage"><p><Link href="/admin/reports">← Volver a reportes</Link></p><div className="pageHeader"><p className="eyebrow">Trust & Safety · explicación</p><h1>{p.display_name}</h1><p>{p.id} · estado <b>{p.status}</b> · alta {new Date(p.created_at).toLocaleDateString('es-PE')}</p></div>
 <div className="riskMetricGrid"><article><strong>{m.reporters_7d}</strong><span>reportantes únicos · 7d</span></article><article><strong>{m.severe_reporters_7d}</strong><span>reportantes graves · 7d</span></article><article><strong>{Number(m.weighted_reports_7d).toFixed(2)}</strong><span>peso de reportes</span></article><article><strong>{Number(m.weighted_severe_7d).toFixed(2)}</strong><span>peso grave</span></article><article><strong>{m.blockers_7d}</strong><span>bloqueos · 7d</span></article><article><strong>{m.shared_device_accounts}</strong><span>cuentas con hash de dispositivo compartido · solo señal auxiliar</span></article></div>
 <div className="softPanel"><strong>Contexto de confianza</strong><p>{p.identity_verification_badge?'Identidad verificada':p.verification_badge?'Perfil verificado':'Sin verificación fuerte'} · Política {m.policy}. Cuentas nuevas, alta velocidad de reportes y reportes recíprocos se ponderan a la baja. El dispositivo nunca decide una sanción por sí solo.</p></div>
 <form action={decide} className="riskDecisionPanel"><input type="hidden" name="userId" value={userId}/><label>Motivo de la decisión<textarea name="reason" required maxLength={1000} defaultValue="Revisión manual de señales, evidencia y contexto."/></label><div className="dialogActions"><button name="action" value="release" className="secondaryButton">解除限制 · Activar</button><button name="action" value="warning" className="secondaryButton">警告 · Warning</button><button name="action" value="suspend" className="secondaryButton">临时停权 · 72h</button><button name="action" value="ban" className="dangerButton">永久封禁 · Ban</button></div><small>El ban nunca se ejecuta por el algoritmo; este botón requiere una decisión humana de Trust & Safety.</small></form>
 <h2>Reportes · últimos 90 días</h2><div className="riskTimeline">{risk.reports.length?risk.reports.map(r=><article key={r.id}><time>{new Date(r.at).toLocaleString('es-PE')}</time><b>{r.category} · {r.priority}</b><p>Credibilidad {Number(r.credibility).toFixed(2)}{r.reciprocal_24h?' · posible reciprocidad/represalia 24h':''} · {r.status}</p></article>):<p>Sin reportes recientes.</p>}</div>
 <h2>Acciones y sanciones</h2><div className="riskTimeline">{risk.moderation_events.map(e=><article key={`e-${e.id}`}><time>{new Date(e.at).toLocaleString('es-PE')}</time><b>Moderación · {e.action}</b><p>{e.human_review?'Requiere revisión humana':'Automatizado/operativo'}</p></article>)}{risk.sanctions.map(s=><article key={`s-${s.id}`}><time>{new Date(s.at).toLocaleString('es-PE')}</time><b>Sanción · {s.type}</b><p>{s.reason_code}{s.reason_note?` · ${s.reason_note}`:''}{s.ends_at?` · hasta ${new Date(s.ends_at).toLocaleString('es-PE')}`:''} · {s.active?'activa':'cerrada'}</p></article>)}</div>
 </section>;
}
