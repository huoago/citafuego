const base=(process.env.SEO_AUDIT_BASE_URL||'https://citafuego.com').replace(/\/$/,'');
const ua={'user-agent':'CitaFuego-SEO-Audit/1.0'};

async function get(path,{redirect='follow'}={}){
  const response=await fetch(`${base}${path}`,{headers:ua,redirect});
  const text=await response.text();
  return {response,text};
}
function expect(condition,message){if(!condition)throw new Error(message);}

const health=await get('/api/health');
expect(health.response.status===200,`/api/health returned ${health.response.status}`);
const healthJson=JSON.parse(health.text);
expect(healthJson.ok===true&&healthJson.service==='citafuego','health identity mismatch');

for(const [from,to] of [['/login','/iniciar-sesion'],['/signup','/registro'],['/register','/registro']]){
  const result=await get(from,{redirect:'manual'});
  expect([301,308].includes(result.response.status),`${from} returned ${result.response.status}; expected permanent redirect`);
  const location=result.response.headers.get('location')||'';
  expect(location.includes(to),`${from} redirect target ${location} does not include ${to}`);
}

const robots=await get('/robots.txt');
expect(robots.response.status===200,'robots.txt unavailable');
expect(robots.text.includes('Sitemap:'),'robots.txt missing sitemap declaration');
for(const token of ['/admin/','/api/','/chat/','/perfil/','/onboarding/'])expect(robots.text.includes(token),`robots.txt missing ${token}`);

const sitemap=await get('/sitemap.xml');
expect(sitemap.response.status===200,'sitemap.xml unavailable');
const locations=[...sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)].map((match)=>match[1]);
expect(locations.length>=50,`sitemap only exposes ${locations.length} URLs; expected at least 50 curated public URLs`);
const privateTokens=['/admin','/api','/chat','/messages','/account','/settings','/verification','/private-album','/album-privado','/perfil','/matches','/likes','/premium','/onboarding','/registro/completar'];
for(const url of locations)for(const token of privateTokens)expect(!new URL(url).pathname.startsWith(token),`private URL leaked into sitemap: ${url}`);

for(const path of ['/','/lima','/guias','/help','/community-guidelines']){
  const page=await get(path);
  expect(page.response.status===200,`${path} returned ${page.response.status}`);
  const lower=page.text.toLowerCase();
  expect(lower.includes('<title'),`${path} missing title`);
  expect(lower.includes('name="description"'),`${path} missing description`);
  expect(lower.includes('rel="canonical"'),`${path} missing canonical`);
  expect(lower.includes('property="og:title"'),`${path} missing Open Graph title`);
  expect(lower.includes('name="twitter:card"'),`${path} missing Twitter card`);
}

for(const path of ['/admin','/perfil','/chats']){
  const page=await get(path,{redirect:'manual'});
  const robotsHeader=(page.response.headers.get('x-robots-tag')||'').toLowerCase();
  expect(robotsHeader.includes('noindex'),`${path} missing X-Robots-Tag noindex`);
}

console.log(`SEO production audit passed for ${base}: ${locations.length} public sitemap URLs, no private leakage.`);
