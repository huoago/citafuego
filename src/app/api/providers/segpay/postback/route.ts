import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { parseSegpayPostback,verifySegpayPostbackSecret } from '@/lib/providers/segpay';

export const dynamic='force-dynamic';

function micros(value:string,currency:string){const amount=Number(value);if(!Number.isFinite(amount)||amount<0)return null;if(currency.toUpperCase()!=='USD')return null;return Math.round(amount*1_000_000)}
function isApproved(value:string){return ['1','true','yes','y','approved'].includes(value.toLowerCase())}

async function handle(request:Request){
 const url=new URL(request.url);if(!verifySegpayPostbackSecret(url))return new NextResponse('FORBIDDEN',{status:403});
 const event=parseSegpayPostback(url);const transactionId=event.transactionId||event.purchaseId||crypto.randomUUID();const kind=(event.transactionType||event.action||event.stage||'transaction').toLowerCase();const amount=micros(event.price,event.currencyCode);
 const db=createServiceClient();
 const {data:existing}=await db.from('provider_transaction_events').select('id,status').eq('provider_slug','segpay').eq('external_event_ref',transactionId).eq('event_kind',kind).maybeSingle();
 if(existing)return new NextResponse('GOOD',{status:200});
 const {data:row,error:insertError}=await db.from('provider_transaction_events').insert({provider_slug:'segpay',external_event_ref:transactionId,event_kind:kind,reference:event.reference||null,amount_usd_micros:amount,currency_code:event.currencyCode||null,metadata:{action:event.action,stage:event.stage,approved:event.approved,purchaseId:event.purchaseId,relatedTransactionId:event.relatedTransactionId}}).select('id').single();
 if(insertError||!row)return new NextResponse('ERROR',{status:500});
 try{
  const reference=event.reference;
  const reversal=kind.includes('refund')||kind.includes('chargeback')||kind.includes('void');
  if(reversal){
   const providerRef=event.relatedTransactionId||event.transactionId;
   const {data:ledger}=await db.from('creator_commercial_ledger').select('id,user_id,gross_usd_micros,platform_usd_micros,creator_usd_micros,reserve_usd_micros,status').eq('provider_slug','segpay').eq('provider_transaction_ref',providerRef).not('status','in','("reversed","void")').order('created_at',{ascending:false}).limit(1).maybeSingle();
   if(ledger){
    await db.from('creator_commercial_ledger').update({status:'reversed',updated_at:new Date().toISOString(),note:`Segpay ${kind}: ${transactionId}`}).eq('id',ledger.id);
    await db.from('creator_commercial_ledger').insert({user_id:ledger.user_id,source_type:kind.includes('chargeback')?'chargeback_reversal':'refund_reversal',source_reference:`segpay:${transactionId}`,gross_usd_micros:-Number(ledger.gross_usd_micros),platform_usd_micros:-Number(ledger.platform_usd_micros),creator_usd_micros:-Number(ledger.creator_usd_micros),reserve_usd_micros:-Number(ledger.reserve_usd_micros),status:'reversed',provider_slug:'segpay',provider_transaction_ref:transactionId,reversal_of:ledger.id,note:`Automatic reversal from Segpay ${kind}`});
   }
  }else if(isApproved(event.approved)){
   if(reference.startsWith('advertiser:')){
    const userId=reference.slice('advertiser:'.length);await db.from('advertiser_accounts').update({billing_status:'ready',provider_customer_ref:transactionId,updated_at:new Date().toISOString()}).eq('user_id',userId);
   }else if(reference.startsWith('branddeal:')){
    const dealId=Number(reference.slice('branddeal:'.length));const {data:deal}=await db.from('brand_deals').select('id,creator_user_id,gross_usd_micros,creator_usd_micros,hold_until,status').eq('id',dealId).maybeSingle();
    if(deal){const platform=Number(deal.gross_usd_micros)-Number(deal.creator_usd_micros);await db.from('brand_deals').update({status:'settling',provider_transaction_ref:transactionId,updated_at:new Date().toISOString()}).eq('id',dealId);await db.from('creator_commercial_ledger').upsert({user_id:deal.creator_user_id,source_type:'brand_deal',source_reference:`branddeal:${dealId}`,gross_usd_micros:Number(deal.gross_usd_micros),platform_usd_micros:platform,creator_usd_micros:Number(deal.creator_usd_micros),reserve_usd_micros:Math.round(Number(deal.creator_usd_micros)*.1),status:'held',hold_until:deal.hold_until,provider_slug:'segpay',provider_transaction_ref:transactionId,note:'Brand Marketplace settlement funded by Segpay'},{onConflict:'source_type,source_reference,user_id'});}
   }
  }
  await db.from('provider_transaction_events').update({status:'processed',processed_at:new Date().toISOString()}).eq('id',row.id);
  return new NextResponse('GOOD',{status:200});
 }catch(error){await db.from('provider_transaction_events').update({status:'failed',processed_at:new Date().toISOString(),metadata:{...event,error:error instanceof Error?error.message:'unknown'}}).eq('id',row.id);return new NextResponse('ERROR',{status:500});}
}

export async function GET(request:Request){return handle(request)}
export async function POST(request:Request){return handle(request)}
