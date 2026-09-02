export const dynamic='force-dynamic';

export async function GET(){
  const key=process.env.INDEXNOW_KEY?.trim();
  if(!key)return new Response('Not configured\n',{status:404,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
  return new Response(`${key}\n`,{status:200,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'public, max-age=3600'}});
}
