export async function GET() {
  return Response.json({ ok: true, service: 'citafuego', version: 'v1.0' });
}
