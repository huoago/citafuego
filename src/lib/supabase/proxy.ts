import { createServerClient } from '@supabase/ssr';
import { NextResponse,type NextRequest } from 'next/server';
import { getSupabasePublishableKey,getSupabaseUrl } from './public-config';

const SAFE_METHODS=new Set(['GET','HEAD','OPTIONS']);

export async function updateSession(request:NextRequest){
  const origin=request.headers.get('origin');
  if(!SAFE_METHODS.has(request.method)&&origin&&origin!==request.nextUrl.origin){
    return new NextResponse('Forbidden',{status:403});
  }

  let response=NextResponse.next({request});
  const supabase=createServerClient(getSupabaseUrl(),getSupabasePublishableKey(),{
    cookies:{
      getAll(){return request.cookies.getAll()},
      setAll(cookiesToSet){
        cookiesToSet.forEach(({name,value})=>request.cookies.set(name,value));
        response=NextResponse.next({request});
        cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options));
      },
    },
  });

  // Keep the SSR session fresh here, but do not duplicate route authorization.
  // /admin authentication and role checks live in the admin layout/API layer so
  // every production admin role shares one source of truth and unauthenticated
  // visitors can reach the normal login redirect instead of a proxy-level 403.
  await supabase.auth.getClaims();
  return response;
}
