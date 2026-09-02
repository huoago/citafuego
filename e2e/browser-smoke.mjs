import { chromium } from 'playwright';

const base=(process.env.E2E_BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
function expect(value,message){if(!value)throw new Error(message);}

const browser=await chromium.launch({headless:true});
try{
  const desktop=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await desktop.newPage();
  let response=await page.goto(`${base}/`,{waitUntil:'networkidle'});
  expect(response?.status()===200,`home returned ${response?.status()}`);
  expect((await page.title()).includes('CitaFuego'),'home title missing CitaFuego');
  expect(await page.locator('link[rel="canonical"]').count()===1,'home canonical missing');
  expect(await page.locator('meta[property="og:title"]').count()===1,'home Open Graph title missing');
  expect(await page.locator('meta[name="twitter:card"]').count()===1,'home Twitter card missing');
  expect(await page.locator('[data-preview-profile]').count()===8,'directory preview cards missing');

  await page.getByRole('button',{name:'Mujeres',exact:true}).click();
  expect(await page.locator('[data-preview-profile]:visible').count()===4,'gender directory filter failed');
  await page.getByRole('button',{name:'Todos',exact:true}).click();
  await page.locator('[data-preview-query]').fill('Barranco');
  expect(await page.locator('[data-preview-profile]:visible').count()===1,'keyword directory filter failed');
  await page.locator('[data-preview-query]').fill('');
  const gridClass=await page.locator('[data-preview-grid]').getAttribute('class');
  await page.getByRole('button',{name:'Vista en lista'}).click();
  expect((await page.locator('[data-preview-grid]').getAttribute('class'))!==gridClass,'list view toggle failed');

  await page.goto(`${base}/login`,{waitUntil:'domcontentloaded'});
  expect(new URL(page.url()).pathname==='/iniciar-sesion','/login did not resolve to /iniciar-sesion');
  expect(await page.getByRole('heading',{name:/bienvenido de nuevo/i}).count()>=1,'login heading missing');

  await page.goto(`${base}/register`,{waitUntil:'domcontentloaded'});
  expect(new URL(page.url()).pathname==='/registro','/register did not resolve to /registro');
  expect(await page.getByRole('heading',{name:/crea tu cuenta/i}).count()>=1,'registration heading missing');

  await page.goto(`${base}/lima/miraflores`,{waitUntil:'domcontentloaded'});
  expect(await page.getByRole('heading',{name:/citas en miraflores/i}).count()===1,'Miraflores SEO page missing');
  expect(await page.locator('script[type="application/ld+json"]').count()>=1,'structured data missing from district page');

  await page.goto(`${base}/guias/seguridad-en-citas-online`,{waitUntil:'domcontentloaded'});
  expect(await page.getByRole('heading',{name:/seguridad en citas online/i}).count()===1,'guide page missing');
  expect(await page.locator('script[type="application/ld+json"]').count()>=2,'guide structured data incomplete');

  const protectedResponse=await desktop.request.get(`${base}/perfil`,{maxRedirects:0});
  expect([302,303,307,308].includes(protectedResponse.status()),`/perfil returned ${protectedResponse.status()} instead of auth redirect`);
  expect((protectedResponse.headers()['x-robots-tag']||'').toLowerCase().includes('noindex'),'/perfil missing noindex header');

  const sitemapResponse=await desktop.request.get(`${base}/sitemap.xml`);
  expect(sitemapResponse.status()===200,'sitemap unavailable');
  const sitemap=await sitemapResponse.text();
  const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1]);
  expect(urls.length>=50,`sitemap contains only ${urls.length} URLs`);
  for(const token of ['/admin','/api','/chat','/perfil','/matches','/premium','/onboarding']){
    expect(!urls.some(url=>new URL(url).pathname.startsWith(token)),`private ${token} URL leaked into sitemap`);
  }
  await desktop.close();

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobilePage=await mobile.newPage();
  await mobilePage.goto(`${base}/`,{waitUntil:'networkidle'});
  const dimensions=await mobilePage.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth}));
  expect(dimensions.scroll<=dimensions.width+2,`mobile home horizontally overflows: ${JSON.stringify(dimensions)}`);
  await mobilePage.goto(`${base}/lima`,{waitUntil:'domcontentloaded'});
  expect(await mobilePage.getByRole('heading',{name:'Citas en Lima'}).count()===1,'mobile Lima hub missing');
  await mobile.close();

  console.log('Playwright browser acceptance passed for desktop + mobile directory/SEO/auth/privacy routes.');
}finally{
  await browser.close();
}
