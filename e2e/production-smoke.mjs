const base=process.env.E2E_BASE_URL||'https://citafuego.com';
const checks=[
  ['/',[200]],['/iniciar-sesion',[200]],['/registro',[200]],['/terminos',[200]],['/privacidad',[200]],['/safety',[200]],['/community-guidelines',[200]],['/help',[200]],['/explorar',[200]],['/como-funciona',[200]],['/offline',[200]],['/manifest.webmanifest',[200]],['/api/health',[200]],
];
for(const[path,allowed]of checks){const r=await fetch(new URL(path,base),{redirect:'manual',headers:{'user-agent':'CitaFuego-Production-Smoke/1.0'}});if(!allowed.includes(r.status))throw new Error(`${path} returned ${r.status}; expected ${allowed.join(',')}`);if(path==='/api/health'){const body=await r.json();if(body?.ok!==true||body?.service!=='citafuego')throw new Error('/api/health identity mismatch');}if(path==='/manifest.webmanifest'){const body=await r.json();if(body?.name!=='CitaFuego'||body?.display!=='standalone')throw new Error('PWA manifest mismatch');}console.log(path,r.status)}
console.log('CitaFuego production public smoke passed');
