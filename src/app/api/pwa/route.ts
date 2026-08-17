import { NextResponse } from 'next/server';
export function GET(){return NextResponse.redirect(new URL('/manifest.webmanifest',process.env.NEXT_PUBLIC_APP_URL||'https://citafuego.com'),308)}
