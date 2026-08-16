import 'server-only';

export function getSegpayConfiguration(){
 const merchantId=process.env.SEGPAY_MERCHANT_ID?.trim()??'';
 const srsUserId=process.env.SEGPAY_SRS_USER_ID?.trim()??'';
 const srsAccessKey=process.env.SEGPAY_SRS_ACCESS_KEY?.trim()??'';
 const baseUrl=process.env.SEGPAY_BASE_URL?.trim()??'';
 const postbackSecret=process.env.SEGPAY_POSTBACK_SECRET?.trim()??'';
 return {provider:'segpay',configured:Boolean(merchantId&&srsUserId&&srsAccessKey&&baseUrl&&postbackSecret),merchantId,srsUserId,srsAccessKey,baseUrl,postbackSecret};
}

function checkoutUrl(baseUrl:string,input:{reference:string;description:string;dynamicPricingId:string}){const url=new URL(baseUrl);url.searchParams.set('dynamicpricingid',input.dynamicPricingId);url.searchParams.set('dynamicdesc',input.description.slice(0,160));url.searchParams.set('REF1',input.reference);return url.toString()}

export async function createSegpayDynamicCheckout(input:{amountUsd:number;reference:string;description:string}){
 const config=getSegpayConfiguration();if(!config.configured)throw new Error('SEGPAY_NOT_CONFIGURED');if(!Number.isFinite(input.amountUsd)||input.amountUsd<=0)throw new Error('SEGPAY_INVALID_AMOUNT');
 const endpoint=new URL('https://srs.segpay.com/MerchantServices/DynamicPricing/');endpoint.searchParams.set('merchantId',config.merchantId);endpoint.searchParams.set('amount',input.amountUsd.toFixed(2));
 const auth=Buffer.from(`${config.srsUserId}:${config.srsAccessKey}`).toString('base64');const response=await fetch(endpoint,{headers:{authorization:`Basic ${auth}`,accept:'application/json'},cache:'no-store'});if(!response.ok)throw new Error(`SEGPAY_DYNAMIC_PRICING_${response.status}`);const body=await response.json() as Record<string,unknown>;const dynamicPricingId=String(body.dynamicPricingId??body.DynamicPricingId??'');if(!dynamicPricingId)throw new Error('SEGPAY_DYNAMIC_PRICING_NO_ID');return{provider:'segpay',dynamicPricingId,url:checkoutUrl(config.baseUrl,{reference:input.reference,description:input.description,dynamicPricingId})};
}

export function verifySegpayPostbackSecret(url:URL){const{postbackSecret}=getSegpayConfiguration();if(!postbackSecret)return false;return url.searchParams.get('cf_secret')===postbackSecret}

export type SegpayPostback={action:string;stage:string;approved:string;transactionType:string;purchaseId:string;transactionId:string;relatedTransactionId:string;price:string;currencyCode:string;reference:string};
export function parseSegpayPostback(url:URL):SegpayPostback{const p=url.searchParams;return{action:p.get('action')??'',stage:p.get('stage')??'',approved:p.get('approved')??'',transactionType:p.get('trantype')??'',purchaseId:p.get('purchaseid')??'',transactionId:p.get('tranid')??'',relatedTransactionId:p.get('relatedtranid')??'',price:p.get('price')??'',currencyCode:p.get('currencycode')??'',reference:p.get('REF1')??p.get('ref1')??''}}
