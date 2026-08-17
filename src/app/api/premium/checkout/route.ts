import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { loadPeruCatalog } from '@/lib/billing/catalog';
import { createSegpayDynamicCheckout } from '@/lib/providers/segpay';
const schema=z.object({productId:z.string().min(1).max(100)});
export async function POST(request:Request){
 const userId=await getAuthenticatedUserId();if(!userId)return NextResponse.json({error:'not_authenticated'},{status:401});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'invalid_request'},{status:400});
 const offer=(await loadPeruCatalog()).find(item=>item.id===parsed.data.productId&&item.kind==='subscription'&&item.tier!=='free');
 if(!offer||!offer.price)return NextResponse.json({error:'offer_unavailable'},{status:404});
 if(offer.price.currency!=='USD')return NextResponse.json({error:'checkout_currency_not_supported'},{status:409});
 const s=await createClient();const{data:purchaseId,error}=await s.rpc('start_premium_purchase',{p_product:offer.id,p_currency:offer.price.currency,p_amount_minor:offer.price.amountMinor,p_provider:'segpay'});
 if(error||!purchaseId)return NextResponse.json({error:'purchase_start_failed'},{status:409});
 try{const checkout=await createSegpayDynamicCheckout({amountUsd:offer.price.amountMinor/100,reference:`premium:${purchaseId}`,description:`CitaFuego ${offer.name}`});return NextResponse.json({url:checkout.url,provider:'segpay',purchaseId});}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:'segpay_unavailable'},{status:503});}
}
