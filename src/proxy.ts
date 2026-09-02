import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request:NextRequest){
  const host=request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if(host==='www.citafuego.com'){
    const url=request.nextUrl.clone();
    url.protocol='https:';
    url.hostname='citafuego.com';
    url.port='';
    return NextResponse.redirect(url,308);
  }
  return updateSession(request);
}

export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
