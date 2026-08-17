const base=process.env.E2E_BASE_URL||'https://citafuego.com';
const publicChecks=[
  '/',
  '/iniciar-sesion','/registro',
  '/swipe','/verificacion','/chat-privado','/random-connect','/para-ti-info','/stories-info','/blog-info','/album-privado','/match-intelligence','/premium-info','/seguridad-privacidad',
  '/terminos','/privacidad','/safety','/community-guidelines','/help','/explorar','/como-funciona','/offline','/manifest.webmanifest','/api/health',
];
const protectedChecks=['/para-ti','/descubrir','/matches','/likes','/chats','/perfil','/stories','/blog','/guardados','/albumes','/citas','/premium'];

for(const path of publicChecks){
  const r=await fetch(new URL(path,base),{redirect:'manual',headers:{'user-agent':'CitaFuego-Production-Smoke/2.0'}});
  if(r.status!==200)throw new Error(`${path} returned ${r.status}; expected 200`);
  if(path==='/api/health'){
    const body=await r.json();
    if(body?.ok!==true||body?.service!=='citafuego')throw new Error('/api/health identity mismatch');
  }
  if(path==='/manifest.webmanifest'){
    const body=await r.json();
    if(body?.name!=='CitaFuego'||body?.display!=='standalone')throw new Error('PWA manifest mismatch');
  }
  console.log('public',path,r.status);
}

for(const path of protectedChecks){
  const r=await fetch(new URL(path,base),{redirect:'manual',headers:{'user-agent':'CitaFuego-Production-Smoke/2.0'}});
  if(![302,303,307,308].includes(r.status))throw new Error(`${path} returned ${r.status}; expected auth redirect`);
  const location=r.headers.get('location')||'';
  if(!location.includes('/iniciar-sesion')&&!location.includes('/onboarding'))throw new Error(`${path} redirect target is not an auth/onboarding gate: ${location}`);
  console.log('protected',path,r.status,location);
}

console.log('CitaFuego production public + protected journey smoke passed');
