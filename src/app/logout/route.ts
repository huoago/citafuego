import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request:NextRequest){
  const supabase=await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/iniciar-sesion',request.url));
}

export async function POST(request:NextRequest){return GET(request);}
