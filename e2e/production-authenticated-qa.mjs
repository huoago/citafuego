import { chromium } from 'playwright';
import { createServerClient } from '@supabase/ssr';

const BASE='https://citafuego.com';
const SUPABASE_URL='https://stfbybkutnoqoxhqxyou.supabase.co';
const SUPABASE_KEY='sb_publishable_bzwmFw6D6rx0X4D5VWonhA_hkxf9c4d';

const admin={
  id:process.env.CF_QA_ADMIN_ID,
  email:process.env.CF_QA_ADMIN_EMAIL,
  password:process.env.CF_QA_ADMIN_PASSWORD,
};
const member={
  id:process.env.CF_QA_MEMBER_ID,
  email:process.env.CF_QA_MEMBER_EMAIL,
  password:process.env.CF_QA_MEMBER_PASSWORD,
};
for(const [label,account] of Object.entries({admin,member})){
  if(!account.id||!account.email||!account.password)throw new Error(`Missing ${label} QA credentials`);
}

const adminRoutes=[
  '/admin','/admin/users','/admin/photos','/admin/verifications','/admin/reports','/admin/moderation','/admin/sanctions','/admin/appeals',
  '/admin/recommendations','/admin/boosts','/admin/locations','/admin/ads','/admin/memberships','/admin/payments','/admin/commercialization',
  '/admin/content','/admin/blog-media','/admin/story-media','/admin/seo','/admin/operations','/admin/health','/admin/risk','/admin/email','/admin/realtime','/admin/integrations','/admin/access','/admin/audit',
];
const memberRoutes=[
  '/descubrir','/matches','/likes','/chats','/perfil','/perfil/fotos','/perfil/identidad','/perfil/prompts','/perfil/verificacion-foto',
  '/perfil/verificacion-telefono','/perfil/whatsapp','/perfil/mas','/stories','/blog','/guardados','/albumes','/citas','/ajustes','/ajustes/cuenta',
  '/seguridad','/seguridad/preferencias','/notificaciones','/invitar','/comunidad','/para-ti','/azar',
];

const findings=[];
const metrics={adminRoutes:0,memberRoutes:0,consoleErrors:0,pageErrors:0,http5xx:0,mobileAdminLinks:0,match:false,chat:false,sessionChecks:0};

function record(severity,area,message,extra={}){findings.push({severity,area,message,...extra});}

async function authCookies(email,password){
  const jar=[];
  const client=createServerClient(SUPABASE_URL,SUPABASE_KEY,{
    auth:{persistSession:true,autoRefreshToken:false},
    cookies:{
      getAll(){return jar.map(({name,value})=>({name,value}));},
      setAll(next){
        for(const cookie of next){
          const index=jar.findIndex(item=>item.name===cookie.name);
          if(index>=0)jar[index]=cookie;else jar.push(cookie);
        }
      },
    },
  });
  const {data,error}=await client.auth.signInWithPassword({email,password});
  if(error||!data.session)throw new Error(`Synthetic Supabase login failed: ${error?.message??'no session'}`);
  if(!jar.length)throw new Error('Synthetic login produced no SSR cookies');
  return jar;
}

function pwCookies(jar){
  return jar.filter(item=>item.value).map(item=>{
    const rawSame=String(item.options?.sameSite??'lax').toLowerCase();
    const sameSite=rawSame==='strict'?'Strict':rawSame==='none'?'None':'Lax';
    return {name:item.name,value:item.value,domain:'citafuego.com',path:item.options?.path??'/',httpOnly:Boolean(item.options?.httpOnly),secure:true,sameSite};
  });
}

async function newContext(browser,account,viewport){
  const cookies=await authCookies(account.email,account.password);
  const context=await browser.newContext({viewport,userAgent:'CitaFuego Production QA/2026.09 Chromium'});
  await context.addCookies(pwCookies(cookies));
  return context;
}

function instrument(page,label){
  page.on('console',msg=>{
    if(msg.type()==='error'){
      metrics.consoleErrors++;
      record('warning',label,`console.error: ${msg.text().slice(0,300)}`);
    }
  });
  page.on('pageerror',error=>{
    metrics.pageErrors++;
    record('error',label,`pageerror: ${String(error.message||error).slice(0,300)}`);
  });
  page.on('response',response=>{
    if(response.url().startsWith(BASE)&&response.status()>=500){
      metrics.http5xx++;
      record('error',label,`HTTP ${response.status()} ${response.url()}`);
    }
  });
}

async function assertSession(page,expectAdmin,label){
  const result=await page.evaluate(async()=>{
    const r=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});
    return {status:r.status,body:await r.json().catch(()=>({}))};
  });
  metrics.sessionChecks++;
  if(result.status!==200||result.body?.authenticated!==true||Boolean(result.body?.admin)!==expectAdmin){
    throw new Error(`${label}: session mismatch ${JSON.stringify(result)}`);
  }
}

async function visit(page,path,area){
  const response=await page.goto(`${BASE}${path}`,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForTimeout(220);
  const status=response?.status()??0;
  const url=page.url();
  const body=(await page.locator('body').innerText().catch(()=>'' )).trim();
  if(status>=500||status===0)throw new Error(`${area}: ${path} returned ${status}`);
  if(url.includes('/iniciar-sesion'))throw new Error(`${area}: ${path} unexpectedly redirected to login`);
  if(body.length<20)throw new Error(`${area}: ${path} rendered nearly empty body`);
  const loadError=(body.match(/No se pudo cargar|No pudimos cargar|Internal Server Error|Application error/gi)||[]).slice(0,3);
  if(loadError.length)record('warning',area,`${path} contains load/error copy`,{matches:loadError});
  return {status,url,body};
}

async function api(page,path,options={}){
  return page.evaluate(async({path,options})=>{
    const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{'content-type':'application/json',...(options.headers||{})}});
    const text=await r.text();let body={};try{body=JSON.parse(text)}catch{body={text:text.slice(0,500)}}
    return {status:r.status,body};
  },{path,options});
}

const browser=await chromium.launch({headless:true});
try{
  // Mobile super-admin: verify the actual regression, session continuity, every permitted admin module.
  const mobileAdminContext=await newContext(browser,admin,{width:390,height:844});
  const mobileAdmin=await mobileAdminContext.newPage();instrument(mobileAdmin,'admin-mobile');
  await visit(mobileAdmin,'/admin','admin-mobile');
  await assertSession(mobileAdmin,true,'admin-mobile');
  const mobileMenu=mobileAdmin.locator('details[data-admin-mobile-nav]');
  if(!await mobileMenu.isVisible())throw new Error('Mobile admin menu is not visible at 390px');
  const desktopSidebar=mobileAdmin.locator('.adminSidebarDesktop');
  if(await desktopSidebar.isVisible())throw new Error('Desktop admin sidebar is incorrectly visible on mobile');
  await mobileMenu.locator('summary').click();
  const hrefs=await mobileMenu.locator('a[href^="/admin"]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('href')).filter(Boolean))]);
  metrics.mobileAdminLinks=hrefs.length;
  if(hrefs.length<adminRoutes.length)record('error','admin-mobile',`Mobile menu exposes ${hrefs.length}/${adminRoutes.length} expected modules`,{hrefs});
  for(const route of adminRoutes){await visit(mobileAdmin,route,'admin-mobile');metrics.adminRoutes++;await assertSession(mobileAdmin,true,`admin-mobile ${route}`);}
  await mobileAdmin.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
  await mobileAdmin.waitForSelector('[data-account-state="authenticated"]',{timeout:10000});
  await mobileAdmin.goBack({waitUntil:'domcontentloaded'}).catch(()=>null);
  await mobileAdmin.goForward({waitUntil:'domcontentloaded'}).catch(()=>null);
  await mobileAdminContext.close();

  // Desktop super-admin: verify desktop navigation is present and no mobile-only menu leaks visually.
  const desktopAdminContext=await newContext(browser,admin,{width:1440,height:900});
  const desktopAdmin=await desktopAdminContext.newPage();instrument(desktopAdmin,'admin-desktop');
  await visit(desktopAdmin,'/admin','admin-desktop');
  await assertSession(desktopAdmin,true,'admin-desktop');
  if(!await desktopAdmin.locator('.adminSidebarDesktop').isVisible())throw new Error('Desktop admin sidebar is not visible at 1440px');
  if(await desktopAdmin.locator('details[data-admin-mobile-nav]').isVisible())throw new Error('Mobile admin menu is incorrectly visible on desktop');

  // Real member journey on a mobile viewport.
  const memberContext=await newContext(browser,member,{width:390,height:844});
  const memberPage=await memberContext.newPage();instrument(memberPage,'member-mobile');
  await visit(memberPage,'/descubrir','member-mobile');
  await assertSession(memberPage,false,'member-mobile');
  await memberPage.waitForSelector('[data-account-state="authenticated"]',{timeout:10000});
  for(const route of memberRoutes){await visit(memberPage,route,'member-mobile');metrics.memberRoutes++;await assertSession(memberPage,false,`member-mobile ${route}`);}
  const discovery=await api(memberPage,'/api/discovery');
  if(discovery.status!==200)record('error','member-api',`Discovery API returned ${discovery.status}`,{body:discovery.body});

  // Real synthetic-to-synthetic Like -> Match -> durable Chat journey.
  const firstLike=await api(memberPage,'/api/interactions',{method:'POST',body:JSON.stringify({toUserId:admin.id,action:'like'})});
  if(firstLike.status!==200)throw new Error(`Member like failed ${JSON.stringify(firstLike)}`);
  const secondLike=await api(desktopAdmin,'/api/interactions',{method:'POST',body:JSON.stringify({toUserId:member.id,action:'like'})});
  if(secondLike.status!==200||secondLike.body?.matched!==true||!secondLike.body?.conversation_id)throw new Error(`Admin reciprocal like did not produce Match ${JSON.stringify(secondLike)}`);
  metrics.match=true;
  const conversationId=secondLike.body.conversation_id;
  const sent=await api(memberPage,'/api/messages',{method:'POST',body:JSON.stringify({conversationId,text:'Hola desde la prueba integral de CitaFuego.',clientMessageId:`qa-${Date.now()}-member`})});
  if(sent.status!==201)throw new Error(`Member message failed ${JSON.stringify(sent)}`);
  const received=await api(desktopAdmin,`/api/messages?conversationId=${encodeURIComponent(conversationId)}`);
  if(received.status!==200||!Array.isArray(received.body?.messages)||!received.body.messages.some(m=>String(m.body||'').includes('prueba integral de CitaFuego')))throw new Error(`Admin did not receive durable message ${JSON.stringify(received)}`);
  const reply=await api(desktopAdmin,'/api/messages',{method:'POST',body:JSON.stringify({conversationId,text:'Respuesta QA recibida correctamente.',clientMessageId:`qa-${Date.now()}-admin`})});
  if(reply.status!==201)throw new Error(`Admin reply failed ${JSON.stringify(reply)}`);
  const memberRead=await api(memberPage,`/api/messages?conversationId=${encodeURIComponent(conversationId)}`);
  if(memberRead.status!==200||!memberRead.body.messages?.some(m=>String(m.body||'').includes('Respuesta QA')))throw new Error('Member could not read admin reply');
  metrics.chat=true;
  await visit(memberPage,`/chats/${conversationId}`,'member-chat-ui');
  await visit(desktopAdmin,`/chats/${conversationId}`,'admin-chat-ui');

  // Session logout is exercised on the synthetic member only.
  const logoutResponse=await memberPage.goto(`${BASE}/logout`,{waitUntil:'domcontentloaded'});
  if((logoutResponse?.status()??0)>=500)throw new Error(`Logout returned ${logoutResponse?.status()}`);
  if(!memberPage.url().includes('/iniciar-sesion')&&!memberPage.url().includes('/login'))record('warning','member-session',`Unexpected logout destination ${memberPage.url()}`);
  const postLogout=await memberPage.goto(`${BASE}/api/auth/session`,{waitUntil:'domcontentloaded'});
  const postLogoutBody=JSON.parse(await memberPage.locator('body').innerText());
  if(postLogout?.status()!==200||postLogoutBody.authenticated!==false)throw new Error(`Logout did not clear session ${JSON.stringify(postLogoutBody)}`);

  await memberContext.close();
  await desktopAdminContext.close();

  const hard=findings.filter(f=>f.severity==='error');
  console.log('CF_QA_SUMMARY '+JSON.stringify({ok:hard.length===0,metrics,findings}));
  if(hard.length)process.exitCode=1;
} finally {
  await browser.close();
}
