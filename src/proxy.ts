import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

const REFERRAL_COOKIE='cf_ref';
const REFERRAL_CODE=/^[A-Z0-9]{10}$/;

export async function proxy(request:NextRequest){
  const host=request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if(host==='www.citafuego.com'){
    const url=request.nextUrl.clone();
    url.protocol='https:';
    url.hostname='citafuego.com';
    url.port='';
    return NextResponse.redirect(url,308);
  }
  const response=await updateSession(request);
  const referral=request.nextUrl.searchParams.get('ref')?.trim().toUpperCase();
  if(request.nextUrl.pathname==='/registro'&&referral&&REFERRAL_CODE.test(referral)){
    response.cookies.set(REFERRAL_COOKIE,referral,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*30});
  }
  return response;
}

export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
