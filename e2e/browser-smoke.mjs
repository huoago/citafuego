import { chromium } from 'playwright';

const base=(process.env.E2E_BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
function expect(value,message){if(!value)throw new Error(message);}

const publicRoutes=['/','/iniciar-sesion','/registro','/community-guidelines','/help','/como-funciona','/explorar','/lima','/lima/miraflores','/guias','/guias/seguridad-en-citas-online','/safety','/seguridad-privacidad','/privacidad','/terminos','/verificacion','/blog-info','/stories-info','/premium-info','/para-ti-info','/random-connect','/match-intelligence'];

async function assertGlobalNavigation(page,route){
  expect(await page.locator('[data-global-site-nav]').count()===1,`${route} does not render exactly one global site navigation`);
  expect(await page.locator('[data-global-site-nav] [data-home-link]').getAttribute('href')==='/',`${route} has no working home link in the global navigation`);
  expect(await page.locator('[data-global-site-nav] a[href="/"]').count()>=1,`${route} has no Inicio/home target`);
  const dead=await page.locator('button:visible:not([disabled])').evaluateAll(nodes=>nodes.filter(node=>{
    const rect=node.getBoundingClientRect();
    const style=getComputedStyle(node);
    return rect.width<1||rect.height<1||style.pointerEvents==='none'||style.visibility==='hidden';
  }).length);
  expect(dead===0,`${route} contains ${dead} visible non-disabled button(s) that cannot be interacted with`);
  expect(await page.locator('a[href="#"],a[href=""]').count()===0,`${route} contains placeholder links`);
}

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
  expect(await page.locator('[data-preview-profile]').count()===4,'compact directory preview cards missing');
  await assertGlobalNavigation(page,'/');

  await page.getByRole('button',{name:'Mujeres',exact:true}).click();
  expect(await page.locator('[data-preview-profile]:visible').count()===2,'gender directory filter failed');
  await page.getByRole('button',{name:'Todos',exact:true}).click();
  await page.locator('[data-preview-query]').fill('Barranco');
  expect(await page.locator('[data-preview-profile]:visible').count()===1,'keyword directory filter failed');
  await page.locator('[data-preview-query]').fill('');
  const gridClass=await page.locator('[data-preview-grid]').getAttribute('class');
  await page.getByRole('button',{name:'Vista en lista'}).click();
  expect((await page.locator('[data-preview-grid]').getAttribute('class'))!==gridClass,'list view toggle failed');

  for(const route of publicRoutes.filter(route=>route!=='/')){
    response=await page.goto(`${base}${route}`,{waitUntil:'domcontentloaded'});
    expect(response&&response.status()<400,`${route} returned ${response?.status()}`);
    await assertGlobalNavigation(page,route);
  }

  await page.goto(`${base}/community-guidelines`,{waitUntil:'domcontentloaded'});
  expect(await page.getByText(/Prostitución|escorts|pago por encuentros|servicios sexuales/i).count()===0,'removed community-guideline prohibition is still visible');
  const menu=page.locator('.globalSiteMenu');
  await menu.locator('summary').click();
  expect(await menu.locator('.globalSiteMenuPanel').isVisible(),'global navigation menu is not interactive');

  await page.goto(`${base}/login`,{waitUntil:'domcontentloaded'});
  expect(new URL(page.url()).pathname==='/iniciar-sesion','/login did not resolve to /iniciar-sesion');
  expect(await page.getByRole('heading',{name:/bienvenido de nuevo/i}).count()>=1,'login heading missing');
  await assertGlobalNavigation(page,'/login redirect');

  await page.goto(`${base}/register`,{waitUntil:'domcontentloaded'});
  expect(new URL(page.url()).pathname==='/registro','/register did not resolve to /registro');
  expect(await page.getByRole('heading',{name:/crea tu cuenta/i}).count()>=1,'registration heading missing');
  await assertGlobalNavigation(page,'/register redirect');

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
  await assertGlobalNavigation(mobilePage,'mobile /');
  const dimensions=await mobilePage.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth}));
  expect(dimensions.scroll<=dimensions.width+2,`mobile home horizontally overflows: ${JSON.stringify(dimensions)}`);
  await mobilePage.goto(`${base}/lima`,{waitUntil:'domcontentloaded'});
  expect(await mobilePage.getByRole('heading',{name:'Citas en Lima'}).count()===1,'mobile Lima hub missing');
  await assertGlobalNavigation(mobilePage,'mobile /lima');
  await mobile.close();

  console.log(`Playwright browser acceptance passed for universal navigation, controls, desktop/mobile directory, SEO, auth and privacy across ${publicRoutes.length} public UI routes.`);
}finally{
  await browser.close();
}
