import {chromium} from 'playwright';
import {createServerClient} from '@supabase/ssr';
import {randomUUID} from 'node:crypto';

const BASE='https://citafuego.com';
const SUPABASE_URL='https://stfbybkutnoqoxhqxyou.supabase.co';
const SUPABASE_KEY='sb_publishable_bzwmFw6D6rx0X4D5VWonhA_hkxf9c4d';
const admin={id:process.env.CF_QA_ADMIN_ID,email:process.env.CF_QA_ADMIN_EMAIL,password:process.env.CF_QA_ADMIN_PASSWORD};
const member={id:process.env.CF_QA_MEMBER_ID,email:process.env.CF_QA_MEMBER_EMAIL,password:process.env.CF_QA_MEMBER_PASSWORD};
for(const [label,account] of Object.entries({admin,member}))if(!account.id||!account.email||!account.password)throw new Error(`Missing ${label} QA credentials`);

const findings=[];
const metrics={checks:0,publicRoutes:0,anonymousAuthz:0,memberAuthz:0,adminValidation:0,idor:0,a11y:0,securityHeaders:0,consoleErrors:0,pageErrors:0,http5xx:0};
function pass(){metrics.checks++;}
function fail(area,message,extra={}){findings.push({severity:'error',area,message,...extra});}
function warn(area,message,extra={}){findings.push({severity:'warning',area,message,...extra});}
function assert(condition,area,message,extra={}){if(condition){pass();return;}fail(area,message,extra);}

async function authCookies(email,password){
  const jar=[];
  const client=createServerClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false},cookies:{getAll(){return jar.map(({name,value})=>({name,value}));},setAll(next){for(const cookie of next){const i=jar.findIndex(x=>x.name===cookie.name);if(i>=0)jar[i]=cookie;else jar.push(cookie);}}}});
  const{data,error}=await client.auth.signInWithPassword({email,password});
  if(error||!data.session)throw new Error(`QA login failed: ${error?.message??'no session'}`);
  return jar;
}
function pwCookies(jar){return jar.filter(x=>x.value).map(item=>{const raw=String(item.options?.sameSite??'lax').toLowerCase();return{name:item.name,value:item.value,domain:'citafuego.com',path:item.options?.path??'/',httpOnly:Boolean(item.options?.httpOnly),secure:true,sameSite:raw==='strict'?'Strict':raw==='none'?'None':'Lax'};});}
async function contextFor(browser,account){const ctx=await browser.newContext({viewport:{width:390,height:844},userAgent:'CitaFuego Security QA/2026.09'});if(account)await ctx.addCookies(pwCookies(await authCookies(account.email,account.password)));return ctx;}
function instrument(page,label){page.on('console',m=>{if(m.type()==='error'){metrics.consoleErrors++;warn(label,`console.error ${m.text().slice(0,220)}`);}});page.on('pageerror',e=>{metrics.pageErrors++;fail(label,`pageerror ${String(e.message||e).slice(0,220)}`);});page.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=500){metrics.http5xx++;fail(label,`HTTP ${r.status()} ${r.url()}`);}});}
async function api(page,path,options={}){return page.evaluate(async({path,options})=>{const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{'content-type':'application/json',...(options.headers||{})}});const text=await r.text();let body;try{body=JSON.parse(text)}catch{body={text:text.slice(0,300)}}return{status:r.status,body,headers:Object.fromEntries(r.headers.entries())};},{path,options});}

const browser=await chromium.launch({headless:true});
try{
  const anonCtx=await contextFor(browser,null);const anon=await anonCtx.newPage();instrument(anon,'anonymous');
  await anon.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});
  let r=await api(anon,'/api/auth/session');assert(r.status===200&&r.body?.authenticated===false&&r.body?.admin===false,'anonymous-session','Anonymous session endpoint must report unauthenticated',{r});metrics.anonymousAuthz++;
  assert(String(r.headers['cache-control']||'').includes('no-store'),'session-cache','Session endpoint must be no-store',{cache:r.headers['cache-control']});metrics.securityHeaders++;
  for(const [path,options,expected] of [
    ['/api/interactions',{method:'POST',body:JSON.stringify({toUserId:member.id,action:'like'})},401],
    ['/api/messages?conversationId='+randomUUID(),{},401],
    ['/api/admin/commercialization/compliance',{method:'POST',body:'{}'},403],
  ]){r=await api(anon,path,options);assert(r.status===expected,'anonymous-authz',`${path} expected ${expected}, got ${r.status}`,{body:r.body});metrics.anonymousAuthz++;}
  await anon.goto(`${BASE}/admin`,{waitUntil:'domcontentloaded'});assert(anon.url().includes('/iniciar-sesion')&&anon.url().includes('next=%2Fadmin')||anon.url().includes('next=/admin'),'anonymous-admin-page','Anonymous /admin must redirect to admin login',{url:anon.url()});metrics.anonymousAuthz++;

  const publicRoutes=['/','/explorar','/como-funciona','/safety','/seguridad-privacidad','/community-guidelines','/blog-info','/iniciar-sesion','/registro','/robots.txt','/sitemap.xml','/api/health'];
  for(const path of publicRoutes){const res=await anonCtx.request.get(`${BASE}${path}`,{maxRedirects:5});assert(res.status()>=200&&res.status()<400,'public-route',`${path} returned ${res.status()}`);metrics.publicRoutes++;if(path==='/'||path==='/iniciar-sesion'){const h=res.headers();assert(String(h['strict-transport-security']||'').length>0,'security-headers',`${path} missing HSTS`);metrics.securityHeaders++;assert(String(h['x-content-type-options']||'').toLowerCase()==='nosniff','security-headers',`${path} missing X-Content-Type-Options nosniff`,{value:h['x-content-type-options']});metrics.securityHeaders++;const framed=Boolean(h['x-frame-options'])||String(h['content-security-policy']||'').includes('frame-ancestors');if(!framed)warn('security-headers',`${path} has no explicit anti-framing header`);}}

  await anon.goto(`${BASE}/iniciar-sesion`,{waitUntil:'networkidle'});
  assert(await anon.locator('h1').count()===1,'a11y-login','Login should have exactly one H1');metrics.a11y++;
  const unnamedButtons=await anon.locator('button').evaluateAll(nodes=>nodes.filter(n=>!((n.getAttribute('aria-label')||n.getAttribute('title')||n.textContent||'').trim())).length);
  assert(unnamedButtons===0,'a11y-login',`Login has ${unnamedButtons} unnamed buttons`);metrics.a11y++;
  const unlabeledInputs=await anon.locator('input').evaluateAll(nodes=>nodes.filter(n=>{const id=n.id;return !(n.closest('label')||(id&&document.querySelector(`label[for="${CSS.escape(id)}"]`))||n.getAttribute('aria-label')||n.getAttribute('aria-labelledby'));}).length);
  assert(unlabeledInputs===0,'a11y-login',`Login has ${unlabeledInputs} unlabeled inputs`);metrics.a11y++;

  const memberCtx=await contextFor(browser,member);const memberPage=await memberCtx.newPage();instrument(memberPage,'member');
  await memberPage.goto(`${BASE}/`,{waitUntil:'domcontentloaded'});r=await api(memberPage,'/api/auth/session');assert(r.status===200&&r.body?.authenticated===true&&r.body?.admin===false,'member-session','Member session must authenticate without admin role',{r});metrics.memberAuthz++;
  await memberPage.goto(`${BASE}/admin`,{waitUntil:'domcontentloaded'});const denied=(await memberPage.locator('body').innerText()).includes('403 · Acceso denegado');assert(denied,'member-admin-page','Regular member must receive admin denied page',{url:memberPage.url()});metrics.memberAuthz++;assert(await memberPage.locator('.adminSidebarDesktop').count()===0,'member-admin-page','Denied member must not receive admin navigation');metrics.memberAuthz++;
  r=await api(memberPage,'/api/admin/commercialization/compliance',{method:'POST',body:'{}'});assert(r.status===403,'member-admin-api',`Member admin API expected 403, got ${r.status}`,{body:r.body});metrics.memberAuthz++;
  r=await api(memberPage,'/api/interactions',{method:'POST',body:JSON.stringify({toUserId:member.id,action:'like'})});assert(r.status===400&&r.body?.error==='invalid_target','interaction-self','Self-target interaction must be rejected',{r});metrics.memberAuthz++;
  r=await api(memberPage,'/api/interactions',{method:'POST',body:JSON.stringify({toUserId:admin.id,action:'invalid'})});assert(r.status===400&&r.body?.error==='invalid_payload','interaction-schema','Invalid interaction action must be rejected',{r});metrics.memberAuthz++;
  r=await api(memberPage,'/api/messages?conversationId=not-a-uuid');assert(r.status===400&&r.body?.error==='invalid_conversation','message-schema','Invalid conversation UUID must be rejected',{r});metrics.idor++;
  const unknownConversation=randomUUID();r=await api(memberPage,`/api/messages?conversationId=${unknownConversation}`);assert(r.status===404&&r.body?.error==='conversation_not_found','message-idor','Unknown conversation must not disclose messages',{r});metrics.idor++;
  r=await api(memberPage,'/api/messages',{method:'POST',body:JSON.stringify({conversationId:unknownConversation,text:'QA isolated message',clientMessageId:`sec-${Date.now()}`})});assert([403,404].includes(r.status),'message-idor',`Non-member/unknown conversation write expected 403/404, got ${r.status}`,{body:r.body});metrics.idor++;

  const adminCtx=await contextFor(browser,admin);const adminPage=await adminCtx.newPage();instrument(adminPage,'admin');
  await adminPage.goto(`${BASE}/admin`,{waitUntil:'domcontentloaded'});r=await api(adminPage,'/api/auth/session');assert(r.status===200&&r.body?.authenticated===true&&r.body?.admin===true,'admin-session','Admin session must authenticate with admin role',{r});metrics.adminValidation++;
  r=await api(adminPage,'/api/admin/commercialization/compliance',{method:'POST',body:'{}'});assert(r.status===400&&r.body?.error==='invalid_payload','admin-validation','Admin malformed compliance request must stop at validation without state change',{r});metrics.adminValidation++;
  const badId=randomUUID();r=await api(adminPage,`/api/messages?conversationId=${badId}`);assert(r.status===404&&r.body?.error==='conversation_not_found','admin-idor','Admin account must not bypass conversation membership/data boundary',{r});metrics.idor++;

  await anonCtx.close();await memberCtx.close();await adminCtx.close();
  const hard=findings.filter(x=>x.severity==='error');
  console.log('CF_SECURITY_QA_SUMMARY '+JSON.stringify({ok:hard.length===0,metrics,findings}));
  if(hard.length)process.exitCode=1;
}finally{await browser.close();}

await import('./production-session-continuity-probe.mjs');
