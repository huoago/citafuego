const key=process.env.INDEXNOW_KEY;
const host=process.env.INDEXNOW_HOST||'citafuego.com';
const keyLocation=process.env.INDEXNOW_KEY_LOCATION||`https://${host}/${key}.txt`;
const urls=process.argv.slice(2).filter((url)=>url.startsWith(`https://${host}/`));

if(!key){console.log('INDEXNOW_KEY is not configured; skipping IndexNow submission.');process.exit(0);}
if(!urls.length){console.log('No public URLs supplied to IndexNow; skipping.');process.exit(0);}

const forbidden=['/admin','/api','/chat','/messages','/account','/settings','/verification','/private-album','/album-privado','/perfil','/matches','/likes','/premium','/onboarding','/registro/completar'];
for(const url of urls){
  const path=new URL(url).pathname;
  if(forbidden.some((prefix)=>path.startsWith(prefix)))throw new Error(`Refusing to submit private URL to IndexNow: ${url}`);
}

const response=await fetch('https://api.indexnow.org/indexnow',{
  method:'POST',
  headers:{'content-type':'application/json; charset=utf-8'},
  body:JSON.stringify({host,key,keyLocation,urlList:[...new Set(urls)].slice(0,10000)}),
});
if(![200,202].includes(response.status))throw new Error(`IndexNow returned ${response.status}: ${await response.text()}`);
console.log(`IndexNow accepted ${urls.length} public URL(s).`);
