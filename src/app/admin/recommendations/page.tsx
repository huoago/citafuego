import {requireAdmin} from '@/lib/admin/auth';
import {RecommendationExperimentActions} from '@/components/admin/recommendation-experiment-actions';
export const dynamic='force-dynamic';
const obj=(v:unknown)=>v&&typeof v==='object'?v as Record<string,unknown>:{};
function allocations(value:unknown){const a=obj(value);return Object.entries(a).map(([key,raw])=>({key,value:Number(raw)})).filter(x=>Number.isFinite(x.value));}
export default async function Page(){
 const a=await requireAdmin(['super_admin','analyst']);if(!a)return null;
 const[{data:metrics,error:metricsError},{data:experiments,error:experimentsError}]=await Promise.all([
   a.admin.rpc('admin_get_recommendation_metrics',{p_days:14}),
   a.admin.from('recommendation_experiments').select('experiment_key,name,status,variants,allocation,started_at,ended_at,updated_at').order('created_at',{ascending:false})
 ]);
 if(metricsError||experimentsError)return <section><h2>Rendimiento del recomendador</h2><div className="adminNotice danger">No se pudo cargar Recommendation V3.</div></section>;
 const m=obj(metrics);const variants=Array.isArray(m.variants)?m.variants.map(obj):[];
 return <section>
  <div className="adminSectionHeader"><div><p className="eyebrow">Recommendation V3</p><h2>Rendimiento del recomendador</h2><p className="muted">Exposición, clic, permanencia, feedback negativo y resultados por variante. La mezcla se muestra como distribución visual, nunca como código interno.</p></div></div>
  <div className="adminMetricGrid"><article className="adminMetric"><small>Impresiones · 14d</small><strong>{Number(m.impressions??0)}</strong></article><article className="adminMetric"><small>Clics · 14d</small><strong>{Number(m.clicks??0)}</strong></article><article className="adminMetric"><small>CTR</small><strong>{Number(m.ctr??0).toFixed(2)}%</strong></article><article className="adminMetric"><small>Permanencia media</small><strong>{Math.round(Number(m.avgDwellMs??0)/1000)}s</strong></article><article className="adminMetric"><small>No me interesa</small><strong>{Number(m.notInterested??0)}</strong></article><article className="adminMetric"><small>Autores ocultos</small><strong>{Number(m.hiddenAuthors??0)}</strong></article></div>
  <div className="adminTableWrap"><h3>Variantes A/B</h3><table className="adminTable"><thead><tr><th>Variante</th><th>Impresiones</th><th>Clics</th><th>CTR</th><th>Permanencia</th><th>Negativo</th></tr></thead><tbody>{variants.map((v,i)=><tr key={String(v.variant??i)}><td>{String(v.variant??'unknown')}</td><td>{Number(v.impressions??0)}</td><td>{Number(v.clicks??0)}</td><td>{Number(v.ctr??0).toFixed(2)}%</td><td>{Math.round(Number(v.avgDwellMs??0)/1000)}s</td><td>{Number(v.notInterested??0)+Number(v.hiddenAuthors??0)}</td></tr>)}</tbody></table></div>
  <div className="adminCardGrid">{(experiments??[]).map(e=>{const mix=allocations(e.allocation);const max=Math.max(1,...mix.map(x=>x.value));return <article key={e.experiment_key} className="adminPanel recommendationExperimentCard"><div className="adminSectionHeader"><div><small>{e.experiment_key}</small><h3>{e.name}</h3></div><span className="adminBadge">{e.status}</span></div><div className="recommendationMix" aria-label="Distribución de mezcla">{mix.length?mix.map(row=><div className="recommendationMixRow" key={row.key}><div><b>{row.key}</b><span>{row.value}%</span></div><div className="recommendationMixTrack"><span style={{width:`${Math.max(3,Math.min(100,row.value/max*100))}%`}}/></div></div>):<p className="muted">Sin distribución configurada.</p>}</div><RecommendationExperimentActions experimentKey={e.experiment_key} status={e.status}/></article>})}</div>
 </section>;
}
