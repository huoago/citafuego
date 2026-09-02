export const dynamic='force-dynamic';

export async function GET(){
  return Response.json({
    ok:true,
    service:'citafuego',
    version:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)||'local',
    environment:process.env.VERCEL_ENV||process.env.NODE_ENV||'unknown',
    timestamp:new Date().toISOString(),
  },{
    status:200,
    headers:{'Cache-Control':'no-store, max-age=0'},
  });
}
