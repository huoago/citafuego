import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request:NextRequest){const s=await createClient();await s.auth.signOut();return NextResponse.redirect(new URL('/login',request.url));}
export async function POST(request:NextRequest){return GET(request);}
