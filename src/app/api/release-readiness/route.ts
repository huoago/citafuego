import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'citafuego',
    release: {
      creatorProgram: 'closed',
      chatContentPersistence: 'device-only',
      randomModes: ['text','voice','video'],
      externalProviderPolicy: 'fail-closed',
    },
  }, { headers: { 'cache-control': 'no-store' } });
}
