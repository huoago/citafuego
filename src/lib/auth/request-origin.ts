const productionHosts=new Set(['citafuego.com','www.citafuego.com']);

export function getAuthRequestOrigin(request:Request){
  const url=new URL(request.url);
  if(process.env.NODE_ENV!=='production')return url.origin;
  const host=url.hostname.toLowerCase();
  if(productionHosts.has(host))return `https://${host}`;
  return 'https://citafuego.com';
}
