import { NextResponse,type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { isActiveAdminUser } from '@/lib/admin/auth';

const allowed=new Set<EmailOtpType>(['email','magiclink','signup','recovery']);
function safeNext(value:string|null){return value&&value.startsWith('/')&&!value.startsWith('//')?value:'/descubrir'}
function redirectNoStore(url:URL){
  const response=NextResponse.redirect(url);
  response.headers.set('Cache-Control','private, no-store');
  response.headers.set('Pragma','no-cache');
  return response;
}

export async function GET(request:NextRequest){
  const tokenHash=request.nextUrl.searchParams.get('token_hash');
  const rawType=request.nextUrl.searchParams.get('type') as EmailOtpType|null;
  const code=request.nextUrl.searchParams.get('code');
  const flow=request.nextUrl.searchParams.get('flow');
  const next=safeNext(request.nextUrl.searchParams.get('next'));
  const providerError=request.nextUrl.searchParams.get('error');
  const url=request.nextUrl.clone();url.search='';
  const s=await createClient();

  let authFailure:'code_exchange'|'otp_verify'|'missing'|null=null;
  if(providerError){authFailure='missing';}
  else if(code){const{error}=await s.auth.exchangeCodeForSession(code);if(error)authFailure='code_exchange';}
  else if(tokenHash&&rawType&&allowed.has(rawType)){const{error}=await s.auth.verifyOtp({token_hash:tokenHash,type:rawType});if(error)authFailure='otp_verify';}
  else{authFailure='missing';}

  if(authFailure){
    if(flow==='register'&&authFailure==='code_exchange'){
      url.pathname='/iniciar-sesion';url.searchParams.set('error','browser_mismatch');url.searchParams.set('from','register');
    }else if(flow==='register'){
      url.pathname='/registro';url.searchParams.set('error','expired_or_invalid_link');
    }else{
      url.pathname='/iniciar-sesion';url.searchParams.set('error','expired_or_invalid_link');
    }
    return redirectNoStore(url);
  }

  const{data:{user}}=await s.auth.getUser();
  if(!user){url.pathname='/iniciar-sesion';url.searchParams.set('error','session_failed');return redirectNoStore(url)}
  if(rawType==='recovery'){
    url.pathname=next==='/descubrir'?'/perfil':next;
    return redirectNoStore(url);
  }
  if(next==='/admin'&&await isActiveAdminUser(s,user.id)){
    url.pathname='/admin';
    return redirectNoStore(url);
  }
  const{data:privateRow}=await s.from('user_private').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!privateRow){url.pathname='/registro/completar';return redirectNoStore(url)}
  const{data:profile}=await s.from('profiles').select('status').eq('id',user.id).maybeSingle();
  if(profile?.status==='active'){url.pathname=next;return redirectNoStore(url)}
  url.pathname='/onboarding';return redirectNoStore(url);
}
