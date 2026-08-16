import 'server-only';

export function getSegpayConfiguration(){
 const srsUserId=process.env.SEGPAY_SRS_USER_ID?.trim()??'';
 const srsAccessKey=process.env.SEGPAY_SRS_ACCESS_KEY?.trim()??'';
 const baseUrl=process.env.SEGPAY_BASE_URL?.trim()??'';
 const postbackSecret=process.env.SEGPAY_POSTBACK_SECRET?.trim()??'';
 return {provider:'segpay',configured:Boolean(srsUserId&&srsAccessKey&&baseUrl&&postbackSecret),srsUserId,srsAccessKey,baseUrl,postbackSecret};
}

export function buildSegpayCheckoutUrl(input:{reference:string;username?:string;description?:string}){
 const {baseUrl}=getSegpayConfiguration();
 if(!baseUrl)throw new Error('SEGPAY_NOT_CONFIGURED');
 const url=new URL(baseUrl);
 url.searchParams.set('ref1',input.reference);
 if(input.username)url.searchParams.set('username',input.username);
 if(input.description)url.searchParams.set('desc',input.description.slice(0,160));
 return url.toString();
}

export function verifySegpayPostbackSecret(url:URL){
 const {postbackSecret}=getSegpayConfiguration();
 if(!postbackSecret)return false;
 return url.searchParams.get('cf_secret')===postbackSecret;
}

export type SegpayPostback={action:string;stage:string;approved:string;transactionType:string;purchaseId:string;transactionId:string;relatedTransactionId:string;price:string;currencyCode:string;reference:string};
export function parseSegpayPostback(url:URL):SegpayPostback{
 const p=url.searchParams;
 return {action:p.get('action')??'',stage:p.get('stage')??'',approved:p.get('approved')??'',transactionType:p.get('trantype')??'',purchaseId:p.get('purchaseid')??'',transactionId:p.get('tranid')??'',relatedTransactionId:p.get('relatedtranid')??'',price:p.get('price')??'',currencyCode:p.get('currencycode')??'',reference:p.get('REF1')??p.get('ref1')??''};
}
