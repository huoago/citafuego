export const dynamic='force-dynamic';

export async function POST(){
  // Document/DNI identity verification is intentionally disabled. Keep this
  // endpoint as a harmless compatibility sink so legacy provider retries do
  // not mutate profiles, trust badges, age state or account restrictions.
  return Response.json({ok:true,disabled:true});
}
