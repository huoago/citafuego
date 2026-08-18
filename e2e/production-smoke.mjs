const base=process.env.E2E_BASE_URL||'https://citafuego.com';
const userAgent={'user-agent':'CitaFuego-Production-Smoke/4.0'};

const readinessResponse=await fetch(new URL('/api/auth/readiness',base),{headers:userAgent});
if(readinessResponse.status!==200)throw new Error(`/api/auth/readiness returned ${readinessResponse.status}; expected 200`);
const authReadiness=await readinessResponse.json();
if(authReadiness?.checked!==true)throw new Error('/api/auth/readiness did not confirm provider readiness');

const publicChecks=[
  '/',
  '/iniciar-sesion','/registro',
  '/swipe','/verificacion','/chat-privado','/random-connect','/para-ti-info','/stories-info','/blog-info','/album-privado','/match-intelligence','/seguridad-privacidad',
  '/terminos','/privacidad','/safety','/community-guidelines','/help','/explorar','/como-funciona','/offline','/manifest.webmanifest','/api/health',
];
const protectedChecks=['/para-ti','/descubrir','/matches','/likes','/chats','/perfil','/stories','/blog','/guardados','/albumes','/citas','/premium'];

function requireText(body,path,label){
  if(!body.toLowerCase().includes(label.toLowerCase()))throw new Error(`${path} missing expected auth method ${label}`);
}

for(const path of publicChecks){
  const r=await fetch(new URL(path,base),{redirect:'manual',headers:userAgent});
  if(r.status!==200)throw new Error(`${path} returned ${r.status}; expected 200`);
  if(path==='/api/health'){
    const body=await r.json();
    if(body?.ok!==true||body?.service!=='citafuego')throw new Error('/api/health service identity mismatch');
  }else if(path==='/manifest.webmanifest'){
    const body=await r.json();
    if(body?.name!=='CitaFuego'||body?.display!=='standalone')throw new Error('PWA manifest mismatch');
  }else if(path==='/iniciar-sesion'){
    const body=await r.text();
    requireText(body,path,'Correo');
    if(authReadiness.phone)requireText(body,path,'SMS');
    if(authReadiness.google)requireText(body,path,'Google');
  }else if(path==='/registro'){
    const body=await r.text();
    if(authReadiness.emailRegistration)requireText(body,path,'Correo');
    if(authReadiness.phone)requireText(body,path,'teléfono');
    if(authReadiness.google)requireText(body,path,'Google');
    if(!authReadiness.emailRegistration&&!authReadiness.phone&&!authReadiness.google)requireText(body,path,'Registro temporalmente no disponible');
  }
  console.log('public',path,r.status);
}

const hiddenMembership=await fetch(new URL('/premium-info',base),{redirect:'manual',headers:userAgent});
if(![301,302,303,307,308].includes(hiddenMembership.status))throw new Error(`/premium-info returned ${hiddenMembership.status}; expected hidden redirect`);
console.log('hidden membership /premium-info',hiddenMembership.status,hiddenMembership.headers.get('location')||'');

for(const path of protectedChecks){
  const r=await fetch(new URL(path,base),{redirect:'manual',headers:userAgent});
  if(![302,303,307,308].includes(r.status))throw new Error(`${path} returned ${r.status}; expected auth redirect`);
  const location=r.headers.get('location')||'';
  if(!location.includes('/iniciar-sesion')&&!location.includes('/onboarding')&&!location.includes('/registro/completar'))throw new Error(`${path} redirect target is not an auth/onboarding gate: ${location}`);
  console.log('protected',path,r.status,location);
}

console.log('CitaFuego production auth-readiness + membership + protected journey smoke passed');
