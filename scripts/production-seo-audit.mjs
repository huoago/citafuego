const base=(process.env.SEO_AUDIT_BASE_URL||'https://citafuego.com').replace(/\/$/,'');
const productionOrigin='https://citafuego.com';
const ua={'user-agent':'CitaFuego-SEO-Audit/2.0'};

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
const expectedVersion=process.env.GITHUB_SHA?.slice(0,12);
if(expectedVersion)expect(healthJson.version===expectedVersion,`production health version ${healthJson.version} does not match ${expectedVersion}`);

for(const [from,to] of [['/login','/iniciar-sesion'],['/signup','/registro'],['/register','/registro']]){
  const result=await get(from,{redirect:'manual'});
  expect([301,308].includes(result.response.status),`${from} returned ${result.response.status}; expected permanent redirect`);
  const location=result.response.headers.get('location')||'';
  expect(location.includes(to),`${from} redirect target ${location} does not include ${to}`);
}

const robots=await get('/robots.txt');
expect(robots.response.status===200,'robots.txt unavailable');
expect((robots.response.headers.get('content-type')||'').toLowerCase().includes('text/plain'),'robots.txt is not text/plain');
expect(robots.text.includes('Sitemap: https://citafuego.com/sitemap.xml'),'robots.txt missing canonical sitemap declaration');
for(const token of ['/admin/','/api/','/chat/','/perfil/','/onboarding/'])expect(robots.text.includes(token),`robots.txt missing ${token}`);

const sitemap=await get('/sitemap.xml');
expect(sitemap.response.status===200,'sitemap.xml unavailable');
expect((sitemap.response.headers.get('content-type')||'').toLowerCase().includes('xml'),'sitemap.xml did not return XML content-type');
expect(/<urlset\b[^>]*xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/.test(sitemap.text),'sitemap.xml is not a standard sitemap urlset');
const locations=[...sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)].map((match)=>match[1]);
expect(locations.length>=50,`sitemap only exposes ${locations.length} URLs; expected at least 50 curated public URLs`);
const privateTokens=['/admin','/api','/chat','/messages','/account','/settings','/verification','/private-album','/album-privado','/perfil','/matches','/likes','/premium','/onboarding','/registro/completar'];
for(const url of locations){
  const parsed=new URL(url);
  expect(parsed.origin===productionOrigin,`non-canonical sitemap origin: ${url}`);
  for(const token of privateTokens)expect(!parsed.pathname.startsWith(token),`private URL leaked into sitemap: ${url}`);
}

for(const url of locations){
  const response=await fetch(url,{headers:ua,redirect:'follow'});
  expect(response.status===200,`sitemap target ${url} returned ${response.status}`);
  expect(new URL(response.url).origin===productionOrigin,`sitemap target ${url} redirected outside canonical origin: ${response.url}`);
}

for(const path of ['/','/lima','/guias','/help','/community-guidelines']){
  const page=await get(path);
  expect(page.response.status===200,`${path} returned ${page.response.status}`);
  const lower=page.text.toLowerCase();
  expect(lower.includes('<title'),`${path} missing title`);
  expect(lower.includes('name="description"'),`${path} missing description`);
  expect(lower.includes('rel="canonical"'),`${path} missing canonical`);
  expect(lower.includes('property="og:title"'),`${path} missing Open Graph title`);
  expect(lower.includes('name="twitter:card"'),`${path} missing Twitter card`);
  if(path==='/'){
    expect(page.text.includes('Personas cerca de ti'),'production homepage is not the current directory-first release');
    expect(page.text.includes('data-preview-grid'),'production homepage is missing current directory grid marker');
  }
}

for(const path of ['/admin','/perfil','/chats']){
  const page=await get(path,{redirect:'manual'});
  const robotsHeader=(page.response.headers.get('x-robots-tag')||'').toLowerCase();
  expect(robotsHeader.includes('noindex'),`${path} missing X-Robots-Tag noindex`);
}

const missing=await get(`/seo-audit-not-found-${Date.now()}`,{redirect:'manual'});
expect(missing.response.status===404,`unknown route returned ${missing.response.status}; expected 404`);

console.log(`SEO production audit passed for ${base}: ${locations.length} public sitemap URLs, canonical XML, all targets 200, no private leakage, true 404.`);
