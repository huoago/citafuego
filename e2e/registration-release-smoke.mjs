const base=process.env.E2E_BASE_URL||'https://citafuego.com';
const headers={'user-agent':'CitaFuego-Registration-Release-Smoke/1.0','cache-control':'no-cache','pragma':'no-cache'};

const readinessResponse=await fetch(new URL('/api/auth/readiness',base),{headers,cache:'no-store'});
if(readinessResponse.status!==200)throw new Error(`/api/auth/readiness returned ${readinessResponse.status}; expected 200`);
const readiness=await readinessResponse.json();

const url=new URL('/registro',base);
url.searchParams.set('release',process.env.GITHUB_SHA?.slice(0,12)||String(Date.now()));
const response=await fetch(url,{headers,cache:'no-store'});
if(response.status!==200)throw new Error(`/registro returned ${response.status}; expected 200`);
const body=await response.text();

if(readiness?.account===true){
  if(!body.includes('data-registration-contract="account-v25-6-72"'))throw new Error('/registro does not expose the current account-v25-6-72 release marker; stale registration HTML detected');
  if(!body.includes('6–72 caracteres'))throw new Error('/registro does not expose the current 6–72 password contract');
  if(body.includes('10–72 caracteres'))throw new Error('/registro still exposes the obsolete 10–72 password contract');
  if(!body.includes('Nombre de cuenta o correo'))throw new Error('/registro is missing the current username-or-email account identifier UI');
}

console.log('Registration release identity smoke passed',JSON.stringify({account:Boolean(readiness?.account),contract:'account-v25-6-72'}));
