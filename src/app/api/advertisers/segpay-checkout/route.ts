import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { areFeaturesEnabled } from '@/lib/features/server';
import { createSegpayDynamicCheckout } from '@/lib/providers/segpay';
import { createClient } from '@/lib/supabase/server';
const schema=z.object({amountUsd:z.number().min(10).max(100000)});
export async function POST(request:Request){
 if(!await areFeaturesEnabled('ADS_ENABLED','PAYMENTS_ENABLED'))return NextResponse.json({error:'feature_unavailable'},{status:404});
 const userId=await getAuthenticatedUserId();if(!userId)return NextResponse.json({error:'not_authenticated'},{status:401});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'invalid_request'},{status:400});
 const s=await createClient();const{data:account}=await s.from('advertiser_accounts').select('business_name,status').eq('user_id',userId).maybeSingle();
 if(!account||account.status!=='approved')return NextResponse.json({error:'advertiser_not_approved'},{status:403});
 try{const checkout=await createSegpayDynamicCheckout({amountUsd:parsed.data.amountUsd,reference:`advertiser:${userId}`,description:`CitaFuego Ads balance · ${account.business_name}`});return NextResponse.json({url:checkout.url,provider:'segpay'})}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:'segpay_unavailable'},{status:503})}
}
