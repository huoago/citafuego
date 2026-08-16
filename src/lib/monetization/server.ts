import 'server-only';
import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';

export type DirectAd={kind:'direct';requestId:string;placementId:number;placement:string;creatorContextId:string|null;campaignId:number;creativeId:number;advertiser:string;headline:string;body:string|null;imageUrl:string|null;cta:string;disclosure:string;destinationUrl:string|null};
export type ExternalAd={kind:'external';requestId:string;placementId:number;placement:string;creatorContextId:string|null;provider:string;providerName:string;publicConfig:Record<string,unknown>;slotKey:string};
export type AdPayload=DirectAd|ExternalAd;

const obj=(v:unknown)=>v&&typeof v==='object'?v as Record<string,unknown>:{};
export async function getAdForPlacement(placement:string,creatorContextId?:string|null):Promise<AdPayload|null>{
 const s=await createClient();const{data,error}=await s.rpc('get_ad_for_placement',{p_placement:placement,p_creator_context:creatorContextId??null,p_request_id:randomUUID()});if(error||!data)return null;const x=obj(data);if(x.kind==='direct')return{kind:'direct',requestId:String(x.requestId),placementId:Number(x.placementId),placement:String(x.placement),creatorContextId:x.creatorContextId?String(x.creatorContextId):null,campaignId:Number(x.campaignId),creativeId:Number(x.creativeId),advertiser:String(x.advertiser??''),headline:String(x.headline??''),body:x.body?String(x.body):null,imageUrl:x.imageUrl?String(x.imageUrl):null,cta:String(x.cta??'Ver más'),disclosure:String(x.disclosure??'Publicidad'),destinationUrl:x.destinationUrl?String(x.destinationUrl):null};
 if(x.kind==='external')return{kind:'external',requestId:String(x.requestId),placementId:Number(x.placementId),placement:String(x.placement),creatorContextId:x.creatorContextId?String(x.creatorContextId):null,provider:String(x.provider??''),providerName:String(x.providerName??''),publicConfig:obj(x.publicConfig),slotKey:String(x.slotKey??'')};
 return null;
}

export type CreatorDashboard={application:Record<string,unknown>|null;creator:Record<string,unknown>|null;followers:number;blogPosts:number;activeStories:number;earnings:{approvedUsdMicros:number;pendingPayoutUsdMicros:number;paidUsdMicros:number;availableUsdMicros:number};recentLedger:Record<string,unknown>[];payouts:Record<string,unknown>[]};
export async function getCreatorDashboard():Promise<CreatorDashboard>{const s=await createClient();const{data}=await s.rpc('get_creator_dashboard');const x=obj(data);const e=obj(x.earnings);return{application:x.application?obj(x.application):null,creator:x.creator?obj(x.creator):null,followers:Number(x.followers??0),blogPosts:Number(x.blogPosts??0),activeStories:Number(x.activeStories??0),earnings:{approvedUsdMicros:Number(e.approvedUsdMicros??0),pendingPayoutUsdMicros:Number(e.pendingPayoutUsdMicros??0),paidUsdMicros:Number(e.paidUsdMicros??0),availableUsdMicros:Number(e.availableUsdMicros??0)},recentLedger:Array.isArray(x.recentLedger)?x.recentLedger.map(obj):[],payouts:Array.isArray(x.payouts)?x.payouts.map(obj):[]};}
