const base=process.env.E2E_BASE_URL||'https://citafuego.com';
const userAgent={'user-agent':'CitaFuego-Production-Smoke/5.0'};

const readinessResponse=await fetch(new URL('/api/auth/readiness',base),{headers:userAgent});
if(readinessResponse.status!==200)throw new Error(`/api/auth/readiness returned ${readinessResponse.status}; expected 200`);
const authReadiness=await readinessResponse.json();
if(authReadiness?.checked!==true)throw new Error('/api/auth/readiness did not confirm provider readiness');

const moderationReadinessResponse=await fetch(new URL('/api/media/moderation/readiness',base),{headers:userAgent});
if(moderationReadinessResponse.status!==200)throw new Error(`/api/media/moderation/readiness returned ${moderationReadinessResponse.status}; expected 200`);
const moderationReadiness=await moderationReadinessResponse.json();
if(moderationReadiness?.checked!==true||moderationReadiness?.profilePhotoAutoReview!==true)throw new Error(`/api/media/moderation/readiness is not ready: ${JSON.stringify(moderationReadiness)}`);

const aggregateReadiness=await fetch(new URL('/api/ready',base),{headers:userAgent});
if(aggregateReadiness.status!==200)throw new Error(`/api/ready returned ${aggregateReadiness.status}; expected 200`);
const aggregateBody=await aggregateReadiness.json();
if(aggregateBody?.ready!==true||aggregateBody?.service!=='citafuego')throw new Error(`/api/ready identity/readiness mismatch: ${JSON.stringify(aggregateBody)}`);

const publicChecks=[
  '/',
  '/iniciar-sesion','/registro',
  '/swipe','/verificacion','/chat-privado','/random-connect','/para-ti-info','/stories-info','/blog-info','/album-privado','/match-intelligence','/seguridad-privacidad',
  '/terminos','/privacidad','/safety','/community-guidelines','/help','/explorar','/como-funciona','/offline','/manifest.webmanifest','/api/health',
  '/robots.txt','/sitemap.xml','/lima','/guias','/guias/seguridad-en-citas-online',
];
const protectedChecks=['/para-ti','/descubrir','/matches','/likes','/chats','/perfil','/stories','/blog','/guardados','/albumes','/citas','/premium'];

function requireText(body,path,label){
  if(!body.toLowerCase().includes(label.toLowerCase()))throw new Error(`${path} missing expected auth method ${label}`);
}
function requireMarker(body,path,marker){
  if(!body.includes(marker))throw new Error(`${path} missing expected state marker ${marker}`);
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
  }else if(path==='/robots.txt'){
    const body=await r.text();
    if(!body.includes('Sitemap:')||!body.includes('/admin/')||!body.includes('/api/'))throw new Error('robots.txt missing sitemap or private exclusions');
  }else if(path==='/sitemap.xml'){
    const body=await r.text();
    const urls=[...body.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1]);
    if(urls.length<50)throw new Error(`sitemap only contains ${urls.length} URLs`);
    const privateTokens=['/admin','/api','/chat','/messages','/account','/settings','/verification','/private-album','/album-privado','/perfil','/matches','/likes','/premium','/onboarding','/registro/completar'];
    for(const url of urls)for(const token of privateTokens)if(new URL(url).pathname.startsWith(token))throw new Error(`private URL leaked into sitemap: ${url}`);
  }else if(path==='/iniciar-sesion'){
    const body=await r.text();
    requireText(body,path,'Correo');
    if(authReadiness.account)requireText(body,path,'Cuenta');
    if(authReadiness.phone)requireText(body,path,'SMS');
    if(authReadiness.google)requireText(body,path,'Google');
  }else if(path==='/registro'){
    const body=await r.text();
    if(authReadiness.account)requireText(body,path,'Cuenta');
    if(authReadiness.emailRegistration)requireText(body,path,'Correo');
    if(authReadiness.phone)requireText(body,path,'Teléfono');
    if(authReadiness.google)requireText(body,path,'Google');
    if(!authReadiness.account&&!authReadiness.emailRegistration&&!authReadiness.phone&&!authReadiness.google)requireMarker(body,path,'data-auth-unavailable="register"');
  }else if(!path.startsWith('/api/')&&!path.endsWith('.xml')&&!path.endsWith('.txt')){
    const body=await r.text();
    const lower=body.toLowerCase();
    if(['/','/lima','/guias','/guias/seguridad-en-citas-online'].includes(path)){
      for(const marker of ['<title','name="description"','rel="canonical"','property="og:title"','name="twitter:card"'])if(!lower.includes(marker))throw new Error(`${path} missing SEO marker ${marker}`);
    }
  }
  console.log('public',path,r.status);
}

for(const [from,to] of [['/login','/iniciar-sesion'],['/signup','/registro'],['/register','/registro']]){
  const r=await fetch(new URL(from,base),{redirect:'manual',headers:userAgent});
  if(![301,308].includes(r.status))throw new Error(`${from} returned ${r.status}; expected permanent redirect`);
  const location=r.headers.get('location')||'';
  if(!location.includes(to))throw new Error(`${from} redirect target mismatch: ${location}`);
}

const hiddenMembership=await fetch(new URL('/premium-info',base),{redirect:'manual',headers:userAgent});
if(![301,302,303,307,308].includes(hiddenMembership.status))throw new Error(`/premium-info returned ${hiddenMembership.status}; expected hidden redirect`);
console.log('hidden membership /premium-info',hiddenMembership.status,hiddenMembership.headers.get('location')||'');

for(const path of protectedChecks){
  const r=await fetch(new URL(path,base),{redirect:'manual',headers:userAgent});
  if(![302,303,307,308].includes(r.status))throw new Error(`${path} returned ${r.status}; expected auth redirect`);
  const robots=(r.headers.get('x-robots-tag')||'').toLowerCase();
  if(!robots.includes('noindex'))throw new Error(`${path} missing noindex response header`);
  const location=r.headers.get('location')||'';
  if(!location.includes('/iniciar-sesion')&&!location.includes('/onboarding')&&!location.includes('/registro/completar'))throw new Error(`${path} redirect target is not an auth/onboarding gate: ${location}`);
  console.log('protected',path,r.status,location);
}

console.log(`CitaFuego production readiness + SEO + account auth + visual moderation (${moderationReadiness.provider}/${moderationReadiness.model}) + protected journey smoke passed`);
