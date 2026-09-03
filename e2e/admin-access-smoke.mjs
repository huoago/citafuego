const base=process.env.E2E_BASE_URL||'https://citafuego.com';
const headers={'user-agent':'CitaFuego-Admin-Access-Smoke/1.0','cache-control':'no-cache','pragma':'no-cache'};

const admin=await fetch(new URL('/admin',base),{redirect:'manual',headers,cache:'no-store'});
if(![302,303,307,308].includes(admin.status))throw new Error(`/admin returned ${admin.status}; expected login redirect for an unauthenticated visitor`);
const location=admin.headers.get('location')||'';
if(!location.includes('/iniciar-sesion')||(!location.includes('next=/admin')&&!location.includes('next=%2Fadmin')))throw new Error(`/admin login redirect lost the backoffice return target: ${location}`);

const loginUrl=new URL(location,base);
const login=await fetch(loginUrl,{redirect:'manual',headers,cache:'no-store'});
if(login.status!==200)throw new Error(`admin login target returned ${login.status}; expected 200`);
const body=await login.text();
if(!body.includes('cuenta administradora'))throw new Error('admin login target did not preserve the explicit backoffice login state');

console.log('Admin access smoke passed',JSON.stringify({status:admin.status,location:loginUrl.pathname+loginUrl.search}));
