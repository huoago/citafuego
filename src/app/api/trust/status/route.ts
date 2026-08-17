import { NextResponse } from 'next/server';

export const dynamic='force-dynamic';

export async function GET(){
  return NextResponse.json({
    visualModeration:{configured:Boolean(process.env.MODERATION_PROVIDER&&process.env.MODERATION_PROVIDER!=='rules')},
    idVerification:{configured:Boolean(process.env.IDENTITY_VERIFICATION_PROVIDER)},
    phoneVerification:{configured:Boolean(process.env.PHONE_VERIFICATION_PROVIDER)},
    premiumCheckout:{configured:Boolean(process.env.PAYMENT_PROVIDER)},
    push:{configured:Boolean(process.env.NEXT_PUBLIC_PUSH_ENABLED==='true')},
  },{headers:{'cache-control':'no-store'}});
}
