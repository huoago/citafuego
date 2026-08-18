import 'server-only';
import type { ModerationDecision } from '@/lib/domain/moderation';
import { MEDIA_POLICY_VERSION } from '@/lib/moderation/media-policy';

const GATEWAY_URL='https://ai-gateway.vercel.sh/v1/chat/completions';
const MODELS_URL='https://ai-gateway.vercel.sh/v1/models';
export const DEFAULT_VISUAL_MODERATION_MODEL='google/gemini-3.6-flash';

const HOLD_REASON='automatic_visual_review_inconclusive';

type VisualScores={
  adult_person:number;
  real_photo:number;
  explicit_nudity:number;
  sexual_activity:number;
  sexual_suggestive:number;
  weapon:number;
  gore:number;
  self_harm:number;
  hate_symbol:number;
  age_uncertain_or_minor:number;
  synthetic_or_impersonation:number;
  no_clear_person:number;
  poor_quality:number;
};

type VisualClassifierPayload={
  confidence?:unknown;
  decision?:unknown;
  scores?:Partial<Record<keyof VisualScores,unknown>>;
  notes?:unknown;
};

function clamp(value:unknown){const n=typeof value==='number'?value:Number(value??0);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0}
function textAt(value:unknown){return typeof value==='string'?value.trim():''}
function stripCodeFence(value:string){return value.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim()}
function hold(explanation:string,modelVersion:string):ModerationDecision{return{labels:{},scores:{},action:'hold',recommendedAction:'hold',explanation,reasons:[HOLD_REASON],humanReviewRequired:true,provider:'vercel-ai-gateway',modelVersion,policyVersion:MEDIA_POLICY_VERSION}}
function parsePayload(value:string):VisualClassifierPayload|null{try{return JSON.parse(stripCodeFence(value)) as VisualClassifierPayload}catch{return null}}
function normalizeScores(input:VisualClassifierPayload['scores']):VisualScores{return{
  adult_person:clamp(input?.adult_person),real_photo:clamp(input?.real_photo),explicit_nudity:clamp(input?.explicit_nudity),sexual_activity:clamp(input?.sexual_activity),sexual_suggestive:clamp(input?.sexual_suggestive),weapon:clamp(input?.weapon),gore:clamp(input?.gore),self_harm:clamp(input?.self_harm),hate_symbol:clamp(input?.hate_symbol),age_uncertain_or_minor:clamp(input?.age_uncertain_or_minor),synthetic_or_impersonation:clamp(input?.synthetic_or_impersonation),no_clear_person:clamp(input?.no_clear_person),poor_quality:clamp(input?.poor_quality),
}}

function decide(payload:VisualClassifierPayload,modelVersion:string):ModerationDecision{
  const scores=normalizeScores(payload.scores);const confidence=clamp(payload.confidence);const modelDecision=textAt(payload.decision).toLowerCase();
  const severe=Math.max(scores.explicit_nudity,scores.sexual_activity,scores.gore,scores.self_harm);
  const dangerous=Math.max(scores.weapon,scores.hate_symbol);
  const uncertain=Math.max(scores.age_uncertain_or_minor,scores.synthetic_or_impersonation,scores.no_clear_person,scores.poor_quality);
  const block=confidence>=.88&&(severe>=.82||dangerous>=.92||modelDecision==='block'&&severe>=.72);
  const clearlySafe=confidence>=.86&&scores.adult_person>=.78&&scores.real_photo>=.72&&severe<.16&&dangerous<.22&&scores.sexual_suggestive<.42&&uncertain<.28&&modelDecision!=='hold'&&modelDecision!=='block';
  const action:ModerationDecision['action']=block?'block':clearlySafe?'allow':'hold';
  const reasons:string[]=[];
  if(scores.explicit_nudity>=.18||scores.sexual_activity>=.18)reasons.push('sexual_content');
  if(scores.sexual_suggestive>=.42)reasons.push('suggestive_content');
  if(scores.weapon>=.22)reasons.push('weapon');if(scores.gore>=.18)reasons.push('gore');if(scores.self_harm>=.18)reasons.push('self_harm');if(scores.hate_symbol>=.22)reasons.push('hate_symbol');
  if(scores.age_uncertain_or_minor>=.28)reasons.push('age_uncertain');if(scores.synthetic_or_impersonation>=.28)reasons.push('synthetic_or_impersonation');if(scores.no_clear_person>=.28)reasons.push('no_clear_person');if(scores.poor_quality>=.28)reasons.push('poor_quality');
  if(action==='hold'&&!reasons.length)reasons.push(HOLD_REASON);
  const labels:ModerationDecision['labels']={};const nudity=Math.max(scores.explicit_nudity,scores.sexual_activity,scores.sexual_suggestive);const violence=Math.max(scores.weapon,scores.gore,scores.self_harm,scores.hate_symbol);
  if(nudity>0)labels.nudity_image=nudity;if(violence>0)labels.violence_image=violence;if(scores.age_uncertain_or_minor>0)labels.minor_risk=scores.age_uncertain_or_minor;if(scores.synthetic_or_impersonation>0)labels.impersonation=scores.synthetic_or_impersonation;
  return{labels,scores:{...scores,confidence},action,recommendedAction:action,explanation:action==='allow'?'Automatic visual review found a clearly adult, real, non-prohibited profile photo.':action==='block'?'Automatic visual review found high-confidence prohibited visual content.':'Automatic visual review was not conclusive enough for automatic approval; Trust & Safety review is required.',reasons,humanReviewRequired:action==='hold',provider:'vercel-ai-gateway',modelVersion,policyVersion:MEDIA_POLICY_VERSION};
}

function moderationPrompt(){return `You are a conservative safety classifier for CitaFuego, an adults-only dating service. Analyze ONE profile photo. Return JSON only, no markdown, using this exact shape: {"decision":"allow|hold|block","confidence":0.0,"scores":{"adult_person":0.0,"real_photo":0.0,"explicit_nudity":0.0,"sexual_activity":0.0,"sexual_suggestive":0.0,"weapon":0.0,"gore":0.0,"self_harm":0.0,"hate_symbol":0.0,"age_uncertain_or_minor":0.0,"synthetic_or_impersonation":0.0,"no_clear_person":0.0,"poor_quality":0.0},"notes":"short reason"}. Score each risk from 0 to 1. 'allow' only when the image clearly shows an adult person, appears to be a real photograph, is usable as a dating profile photo, and has no prohibited or meaningfully suggestive content. Use 'hold' whenever age is uncertain, the person is unclear, the image may be synthetic/impersonation, quality is poor, or the safety judgment is ambiguous. Use 'block' only for high-confidence explicit nudity/sexual activity, graphic gore/self-harm, hate symbols, or dangerous weapon content. Do not identify the person and do not infer ethnicity, religion, health, orientation, or other sensitive traits.`}

export async function moderateProfilePhotoWithVercelAI(input:{token:string;bytes:ArrayBuffer;mimeType:string;model?:string}):Promise<ModerationDecision>{
  const model=(input.model||process.env.VISUAL_MODERATION_MODEL||DEFAULT_VISUAL_MODERATION_MODEL).trim();if(!input.token||!input.bytes.byteLength)return hold('Automatic visual review is unavailable; the photo is held for Trust & Safety review.',model);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18_000);
  try{
    const base64=Buffer.from(input.bytes).toString('base64');
    const response=await fetch(GATEWAY_URL,{method:'POST',headers:{authorization:`Bearer ${input.token}`,'content-type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:moderationPrompt()},{role:'user',content:[{type:'text',text:'Classify this profile photo conservatively.'},{type:'image_url',image_url:{url:`data:${input.mimeType||'image/webp'};base64,${base64}`,detail:'low'}}]}],temperature:0,max_tokens:320,stream:false}),signal:controller.signal,cache:'no-store'});
    if(!response.ok)return hold(`Automatic visual review provider returned ${response.status}; the photo is held for Trust & Safety review.`,model);
    const body=await response.json() as {choices?:Array<{message?:{content?:unknown}}>};const raw=body.choices?.[0]?.message?.content;const content=typeof raw==='string'?raw:Array.isArray(raw)?raw.map((item:unknown)=>typeof item==='object'&&item!==null&&'text'in item?String((item as {text?:unknown}).text??''):'').join(''):'';const parsed=parsePayload(content);
    return parsed?decide(parsed,model):hold('Automatic visual review returned an unreadable result; the photo is held for Trust & Safety review.',model);
  }catch{return hold('Automatic visual review was unavailable or timed out; the photo is held for Trust & Safety review.',model)}finally{clearTimeout(timer)}
}

export async function checkVercelVisualModerationReadiness(token:string){
  const model=(process.env.VISUAL_MODERATION_MODEL||DEFAULT_VISUAL_MODERATION_MODEL).trim();if(!token)return{ready:false,provider:'vercel-ai-gateway',model,reason:'missing_oidc'};
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8_000);
  try{const response=await fetch(MODELS_URL,{headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},signal:controller.signal,cache:'no-store'});if(!response.ok)return{ready:false,provider:'vercel-ai-gateway',model,reason:`gateway_${response.status}`};const body=await response.json() as {data?:Array<{id?:string}>};const found=Array.isArray(body.data)&&body.data.some(item=>item.id===model);return{ready:found,provider:'vercel-ai-gateway',model,reason:found?'ready':'model_unavailable'}}catch{return{ready:false,provider:'vercel-ai-gateway',model,reason:'gateway_unreachable'}}finally{clearTimeout(timer)}}
