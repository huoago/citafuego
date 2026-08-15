const base=process.env.E2E_BASE_URL||'https://citafuego.com';
const paths=['/','/login','/signup','/terms','/privacy','/safety','/community-guidelines','/api/health'];
for(const path of paths){const r=await fetch(new URL(path,base),{redirect:'manual'});if(r.status>=500)throw new Error(`${path} returned ${r.status}`);console.log(path,r.status)}
