import { NextResponse,type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const allowed=new Set<EmailOtpType>(['email','magiclink','signup','recovery']);
function safeNext(value:string|null){return value&&value.startsWith('/')&&!value.startsWith('//')?value:'/descubrir'}

export async function GET(request:NextRequest){
  const tokenHash=request.nextUrl.searchParams.get('token_hash');
  const rawType=request.nextUrl.searchParams.get('type') as EmailOtpType|null;
  const code=request.nextUrl.searchParams.get('code');
  const next=safeNext(request.nextUrl.searchParams.get('next'));
  const url=request.nextUrl.clone();url.search='';
  const s=await createClient();

  let authError=false;
  if(code){
    const{error}=await s.auth.exchangeCodeForSession(code);authError=Boolean(error);
  }else if(tokenHash&&rawType&&allowed.has(rawType)){
    const{error}=await s.auth.verifyOtp({token_hash:tokenHash,type:rawType});authError=Boolean(error);
  }else{
    authError=true;
  }
  if(authError){url.pathname='/iniciar-sesion';url.searchParams.set('error','expired_or_invalid_link');return NextResponse.redirect(url)}

  const{data:{user}}=await s.auth.getUser();
  if(!user){url.pathname='/iniciar-sesion';url.searchParams.set('error','session_failed');return NextResponse.redirect(url)}
  if(rawType==='recovery'){
    url.pathname=next==='/descubrir'?'/perfil':next;
    return NextResponse.redirect(url);
  }
  const{data:privateRow}=await s.from('user_private').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!privateRow){url.pathname='/registro/completar';return NextResponse.redirect(url)}
  const{data:profile}=await s.from('profiles').select('status').eq('id',user.id).maybeSingle();
  if(profile?.status==='active'){url.pathname=next;return NextResponse.redirect(url)}
  url.pathname='/onboarding';return NextResponse.redirect(url);
}
