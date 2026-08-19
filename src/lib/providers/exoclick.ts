import 'server-only';
import {createServiceClient} from '@/lib/supabase/service';

const API_BASE='https://api.exoclick.com/v2';
type Json=Record<string,unknown>;
const asObject=(value:unknown):Json=>value&&typeof value==='object'?value as Json:{};

async function vaultToken(){
 try{const db=createServiceClient();const{data,error}=await db.rpc('backend_get_provider_config',{p_provider_slug:'exoclick'});if(error||!data)return'';const secrets=asObject(asObject(data).secrets);return String(secrets.EXOCLICK_API_TOKEN??'').trim()}catch{return''}
}

export async function getExoClickConfiguration(){
 const envToken=process.env.EXOCLICK_API_TOKEN?.trim()??'';const token=envToken||await vaultToken();
 return {provider:'exoclick',configured:Boolean(token),apiBase:API_BASE,token,source:envToken?'environment':'vault'};
}

async function login(){
 const {token}=await getExoClickConfiguration();
 if(!token)throw new Error('EXOCLICK_NOT_CONFIGURED');
 const response=await fetch(`${API_BASE}/login`,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({api_token:token}),cache:'no-store'});
 if(!response.ok)throw new Error(`EXOCLICK_LOGIN_${response.status}`);
 const body=asObject(await response.json());const result=asObject(body.result);const bearer=String(body.token??result.token??'');const type=String(body.type??result.type??'Bearer');
 if(!bearer)throw new Error('EXOCLICK_LOGIN_NO_TOKEN');return `${type} ${bearer}`;
}

export async function getExoClickPublisherStats(dateFrom:string,dateTo:string){
 const authorization=await login();
 const response=await fetch(`${API_BASE}/statistics/p/global`,{method:'POST',headers:{authorization,'content-type':'application/json','accept':'application/json'},body:JSON.stringify({filter:{date_from:dateFrom,date_to:dateTo},group_by:['date'],totals:1,projection:{base:['impressions','clicks','revenue','ctr','cpm']}}),cache:'no-store'});
 if(!response.ok)throw new Error(`EXOCLICK_STATS_${response.status}`);return asObject(await response.json());
}
