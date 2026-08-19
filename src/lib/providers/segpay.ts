import 'server-only';
import {createServiceClient} from '@/lib/supabase/service';

type RuntimeProviderConfig={secrets?:Record<string,unknown>};

async function vaultSecrets(){
 try{
  const db=createServiceClient();
  const{data,error}=await db.rpc('backend_get_provider_config',{p_provider_slug:'segpay'});
  if(error||!data)return{} as Record<string,string>;
  const body=data as RuntimeProviderConfig;const raw=body.secrets??{};
  return Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,String(v??'')])) as Record<string,string>;
 }catch{return{} as Record<string,string>}
}

export async function getSegpayConfiguration(){
 const env={
  merchantId:process.env.SEGPAY_MERCHANT_ID?.trim()??'',
  srsUserId:process.env.SEGPAY_SRS_USER_ID?.trim()??'',
  srsAccessKey:process.env.SEGPAY_SRS_ACCESS_KEY?.trim()??'',
  baseUrl:process.env.SEGPAY_BASE_URL?.trim()??'',
  postbackSecret:process.env.SEGPAY_POSTBACK_SECRET?.trim()??'',
 };
 if(env.merchantId&&env.srsUserId&&env.srsAccessKey&&env.baseUrl&&env.postbackSecret)return{provider:'segpay',configured:true,...env,source:'environment' as const};
 const vault=await vaultSecrets();
 const merged={
  merchantId:env.merchantId||vault.SEGPAY_MERCHANT_ID||'',
  srsUserId:env.srsUserId||vault.SEGPAY_SRS_USER_ID||'',
  srsAccessKey:env.srsAccessKey||vault.SEGPAY_SRS_ACCESS_KEY||'',
  baseUrl:env.baseUrl||vault.SEGPAY_BASE_URL||'',
  postbackSecret:env.postbackSecret||vault.SEGPAY_POSTBACK_SECRET||'',
 };
 return{provider:'segpay',configured:Boolean(merged.merchantId&&merged.srsUserId&&merged.srsAccessKey&&merged.baseUrl&&merged.postbackSecret),...merged,source:'environment+vault' as const};
}

function checkoutUrl(baseUrl:string,input:{reference:string;description:string;dynamicPricingId:string}){const url=new URL(baseUrl);url.searchParams.set('dynamicpricingid',input.dynamicPricingId);url.searchParams.set('dynamicdesc',input.description.slice(0,160));url.searchParams.set('REF1',input.reference);return url.toString()}

export async function createSegpayDynamicCheckout(input:{amountUsd:number;reference:string;description:string}){
 const config=await getSegpayConfiguration();if(!config.configured)throw new Error('SEGPAY_NOT_CONFIGURED');if(!Number.isFinite(input.amountUsd)||input.amountUsd<=0)throw new Error('SEGPAY_INVALID_AMOUNT');
 const endpoint=new URL('https://srs.segpay.com/MerchantServices/DynamicPricing/');endpoint.searchParams.set('merchantId',config.merchantId);endpoint.searchParams.set('amount',input.amountUsd.toFixed(2));
 const auth=Buffer.from(`${config.srsUserId}:${config.srsAccessKey}`).toString('base64');const response=await fetch(endpoint,{headers:{authorization:`Basic ${auth}`,accept:'application/json'},cache:'no-store'});if(!response.ok)throw new Error(`SEGPAY_DYNAMIC_PRICING_${response.status}`);const body=await response.json() as Record<string,unknown>;const dynamicPricingId=String(body.dynamicPricingId??body.DynamicPricingId??'');if(!dynamicPricingId)throw new Error('SEGPAY_DYNAMIC_PRICING_NO_ID');return{provider:'segpay',dynamicPricingId,url:checkoutUrl(config.baseUrl,{reference:input.reference,description:input.description,dynamicPricingId})};
}

export async function verifySegpayPostbackSecret(url:URL){const{postbackSecret}=await getSegpayConfiguration();if(!postbackSecret)return false;return url.searchParams.get('cf_secret')===postbackSecret}

export type SegpayPostback={action:string;stage:string;approved:string;transactionType:string;purchaseId:string;transactionId:string;relatedTransactionId:string;price:string;currencyCode:string;reference:string};
export function parseSegpayPostback(url:URL):SegpayPostback{const p=url.searchParams;return{action:p.get('action')??'',stage:p.get('stage')??'',approved:p.get('approved')??'',transactionType:p.get('trantype')??'',purchaseId:p.get('purchaseid')??'',transactionId:p.get('tranid')??'',relatedTransactionId:p.get('relatedtranid')??'',price:p.get('price')??'',currencyCode:p.get('currencycode')??'',reference:p.get('REF1')??p.get('ref1')??''}}
