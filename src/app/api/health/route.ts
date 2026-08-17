export async function GET() {
  return Response.json({ ok: true, service: 'citafuego', version: '2026.08.17-ios-social' });
}
