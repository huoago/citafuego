import { NextResponse,type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function safeNext(value:string|null){return value&&value.startsWith('/')&&!value.startsWith('//')?value:'/descubrir'}

export async function GET(request:NextRequest){
  const mode=request.nextUrl.searchParams.get('mode')==='register'?'register':'login';
  const next=safeNext(request.nextUrl.searchParams.get('next'));
  const origin=process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,'')??request.nextUrl.origin;
  const s=await createClient();
  const{data,error}=await s.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo:`${origin}/auth/confirm?next=${encodeURIComponent(next)}`,queryParams:{prompt:'select_account'}},
  });
  if(error||!data.url){
    const url=new URL(mode==='register'?'/registro':'/iniciar-sesion',origin);
    url.searchParams.set('auth_error','google_unavailable');
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(data.url);
}
