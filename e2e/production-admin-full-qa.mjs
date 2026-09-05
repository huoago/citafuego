import { chromium } from 'playwright';
import crypto from 'node:crypto';
import fs from 'node:fs';
import sharp from 'sharp';

const base='https://citafuego.com';
const runId=String(process.env.GITHUB_RUN_ID||Date.now());
const suffix=runId.slice(-10);
const adminUsername=`qaadm_${suffix}`;
const peerUsername=`qausr_${suffix}`;
const adminName=`QA Admin ${suffix.slice(-4)}`;
const peerName=`QA User ${suffix.slice(-4)}`;
const adminPassword=`Qa!${crypto.randomBytes(20).toString('base64url')}9a`;
const peerPassword=`Qu!${crypto.randomBytes(20).toString('base64url')}8b`;
const reportMarker=`QA-E2E-${runId}`;
const report={runId,base,accounts:{adminUsername,peerUsername},startedAt:new Date().toISOString(),steps:[],errors:[]};

function record(name,ok,detail=''){report.steps.push({name,ok,detail,at:new Date().toISOString()});console.log(`${ok?'PASS':'FAIL'} :: ${name}${detail?` :: ${detail}`:''}`)}
function must(condition,name,detail=''){if(!condition){record(name,false,detail);throw new Error(`${name}: ${detail}`)}record(name,true,detail)}
async function saveReport(){report.finishedAt=new Date().toISOString();fs.mkdirSync('qa-artifacts',{recursive:true});fs.writeFileSync('qa-artifacts/production-admin-full-qa.json',JSON.stringify(report,null,2));}
async function screenshot(page,name){fs.mkdirSync('qa-artifacts/screenshots',{recursive:true});await page.screenshot({path:`qa-artifacts/screenshots/${name}.png`,fullPage:true}).catch(()=>{});}
async function gotoOk(page,path,name){const r=await page.goto(`${base}${path}`,{waitUntil:'domcontentloaded',timeout:30000});must(Boolean(r)&&r.status()<400,name,`status=${r?.status()} url=${page.url()}`);return r}

async function createActiveProfile(context,{username,password,displayName,gender,wantLabel}){
  const page=await context.newPage();
  await gotoOk(page,'/registro',`${username}: registration page`);
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.getByRole('button',{name:'Crear cuenta'}).click();
  await page.waitForURL('**/registro/completar',{timeout:30000});
  must(page.url().includes('/registro/completar'),`${username}: account registration`,`url=${page.url()}`);
  await page.getByLabel('Día').selectOption('1');
  await page.getByLabel('Mes').selectOption('1');
  await page.getByLabel('Año').selectOption('1990');
  const checks=page.locator('fieldset.legalGroup input[type="checkbox"]');
  for(let i=0;i<await checks.count();i++)await checks.nth(i).check();
  await page.getByRole('button',{name:'Continuar a mi perfil'}).click();
  await page.waitForURL('**/onboarding**',{timeout:30000});
  must(page.url().includes('/onboarding'),`${username}: legal + 18+ consent`);
  await page.locator('input[name="displayName"]').fill(displayName);
  await page.locator('select[name="gender"]').selectOption(gender);
  await page.locator('input[name="district"]').fill('Miraflores');
  await page.locator('textarea[name="bio"]').fill(`${reportMarker} perfil sintético de control. No es una persona real.`);
  await page.locator('select[name="intent"]').selectOption('friendship');
  const wantButton=page.getByRole('button',{name:wantLabel,exact:true});
  if(await wantButton.count())await wantButton.click();
  const intention=page.locator('input[name="intentions"][value="friendship"]');
  if(await intention.count())await intention.check();
  await page.getByRole('button',{name:'Guardar y continuar'}).click();
  await page.getByRole('heading',{name:'Añade fotos reales'}).waitFor({timeout:30000});
  record(`${username}: profile saved`,true);
  await page.getByRole('button',{name:'Continuar sin fotos'}).click();
  await page.getByRole('heading',{name:'Activa tu perfil'}).waitFor({timeout:15000});
  const enter=page.getByRole('button',{name:/Entrar a CitaFuego/});
  await enter.waitFor({state:'visible',timeout:15000});
  const navigation=page.waitForURL('**/descubrir',{timeout:30000});
  await enter.evaluate(el=>el.click());
  await navigation;
  record(`${username}: profile activation`,true,`url=${page.url()}`);
  return page;
}

async function testPhotoUpload(page,username){
  await gotoOk(page,'/onboarding?edit=1',`${username}: reopen profile editor for photo QA`);
  await page.getByRole('button',{name:'Fotos',exact:true}).click();
  await page.getByRole('heading',{name:'Añade fotos reales'}).waitFor({timeout:15000});
  const imagePath=`qa-artifacts/${username}.png`;
  fs.mkdirSync('qa-artifacts',{recursive:true});
  await sharp({create:{width:720,height:960,channels:3,background:{r:42,g:42,b:48}}}).png().toFile(imagePath);
  const completion=page.waitForResponse(r=>r.url().includes('/api/media/profile-photo/complete')&&r.request().method()==='POST',{timeout:30000}).catch(()=>null);
  await page.locator('.photoSlot input[type="file"]').first().setInputFiles(imagePath);
  const response=await completion;
  must(Boolean(response)&&response.status()<400,`${username}: profile photo upload API`,`status=${response?.status()}`);
  await gotoOk(page,'/descubrir',`${username}: return to discovery after photo QA`);
}

async function waitForAdmin(context){
  for(let i=0;i<120;i++){
    const r=await context.request.get(`${base}/api/auth/session`,{headers:{accept:'application/json'}}).catch(()=>null);
    if(r?.ok()){
      const j=await r.json().catch(()=>null);
      if(j?.authenticated===true&&j?.admin===true){record('temporary QA admin grant detected',true);return true}
    }
    if(i===0)console.log(`QA_ADMIN_WAITING username=${adminUsername}`);
    await new Promise(r=>setTimeout(r,5000));
  }
  return false;
}

async function testPublic(page){
  const routes=[['/','Inicio'],['/explorar','Explorar'],['/como-funciona','Cómo funciona'],['/safety','Seguridad'],['/seguridad-privacidad','Privacidad'],['/community-guidelines','Normas'],['/help','Ayuda'],['/terminos','Términos'],['/privacidad','Privacidad'],['/registro','Crea tu cuenta'],['/iniciar-sesion','Bienvenido de nuevo']];
  for(const [path,label] of routes){await gotoOk(page,path,`public ${path}`);const body=(await page.locator('body').innerText()).slice(0,3000);must(body.toLowerCase().includes(label.toLowerCase().split(' ')[0]),`public content ${path}`)}
}

async function testAccountRoutes(page){
  const routes=['/perfil','/descubrir','/matches','/chats','/notificaciones','/guardados','/azar','/onboarding?edit=1','/ajustes','/ajustes/cuenta','/likes','/citas','/comunidad','/para-ti','/invitar','/blog','/stories','/perfil/fotos','/perfil/identidad','/perfil/mas','/perfil/prompts','/seguridad','/seguridad/preferencias','/boost','/premium','/premium/beneficios','/premium/filtros','/tienda'];
  for(const path of routes){await gotoOk(page,path,`authenticated ${path}`);must(!page.url().includes('/iniciar-sesion'),`authenticated access ${path}`)}
}

const adminRoutes=['/admin','/admin/users','/admin/photos','/admin/verifications','/admin/reports','/admin/moderation','/admin/sanctions','/admin/appeals','/admin/recommendations','/admin/boosts','/admin/locations','/admin/ads','/admin/memberships','/admin/payments','/admin/commercialization','/admin/content','/admin/blog-media','/admin/story-media','/admin/seo','/admin/operations','/admin/health','/admin/risk','/admin/email','/admin/realtime','/admin/integrations','/admin/access','/admin/audit','/admin/creators'];
async function testAdminRoutes(page){for(const path of adminRoutes){const r=await page.goto(`${base}${path}`,{waitUntil:'domcontentloaded',timeout:30000});const body=(await page.locator('body').innerText()).slice(0,5000);must(Boolean(r)&&r.status()<400&&!body.includes('403 · Acceso denegado')&&!body.includes('No se pudo cargar'),`admin route ${path}`,`status=${r?.status()} url=${page.url()}`)}}

async function findAdminUserId(page,displayName){
  await gotoOk(page,`/admin/users?q=${encodeURIComponent(displayName)}`,`lookup ${displayName} in admin users`);
  const row=page.locator('tr',{hasText:displayName}).first();
  must(await row.count()>0,`admin users row ${displayName}`);
  const id=(await row.locator('small.adminCode').first().innerText()).trim();
  must(/^[0-9a-f-]{36}$/i.test(id),`resolve UUID ${displayName}`,id);
  return id;
}

async function testPhotoModeration(page,adminId){
  await gotoOk(page,'/admin/photos','admin photo moderation queue');
  const card=page.locator('article',{hasText:adminId}).first();
  must(await card.count()>0,'synthetic photo appears in moderation queue',adminId);
  const responsePromise=page.waitForResponse(r=>r.url().includes('/api/admin/photos/')&&r.request().method()==='POST',{timeout:20000}).catch(()=>null);
  await card.getByRole('button',{name:'Aprobar'}).click();
  const response=await responsePromise;
  must(Boolean(response)&&response.status()<400,'admin approves synthetic profile photo',`status=${response?.status()}`);
}

async function testUserStatus(page,peerId){
  const path=`/admin/users?q=${encodeURIComponent(peerId)}`;
  await gotoOk(page,path,'admin user status lookup');
  let row=page.locator('tr',{hasText:peerId}).first();
  const select=row.locator('select[name="status"]');
  must(await select.count()>0,'user status control available');
  await select.selectOption('restricted');
  await row.getByRole('button',{name:'Aplicar'}).click();
  await page.waitForTimeout(800);
  await gotoOk(page,path,'verify restricted user status');
  must((await page.locator('tr',{hasText:peerId}).first().innerText()).includes('restricted'),'user can be restricted from admin');
  row=page.locator('tr',{hasText:peerId}).first();
  await row.locator('select[name="status"]').selectOption('active');
  await row.getByRole('button',{name:'Aplicar'}).click();
  await page.waitForTimeout(800);
  await gotoOk(page,path,'verify restored user status');
  must((await page.locator('tr',{hasText:peerId}).first().innerText()).includes('active'),'user can be restored to active');
}

async function testSanction(page,peerId){
  await gotoOk(page,'/admin/sanctions','admin sanctions write');
  await page.getByLabel('User UUID').fill(peerId);
  await page.getByLabel('Tipo').selectOption('warning');
  await page.getByLabel('Código de motivo').fill('qa_validation');
  await page.getByLabel('Nota').fill(`${reportMarker} warning sintético; eliminar tras QA.`);
  await page.getByRole('button',{name:'Aplicar con auditoría'}).click();
  await page.getByText(/Sanción creada:/).waitFor({timeout:15000});
  record('admin creates audited warning sanction',true,peerId);
}

async function testDiscoveryAndMatch(adminPage,peerPage){
  await gotoOk(adminPage,'/descubrir','admin discover');
  const search=adminPage.getByLabel('Buscar perfiles');
  if(await search.count()){await search.fill(peerName);await adminPage.getByLabel('Vista en lista').click();await adminPage.getByLabel('Vista en cuadrícula').click();const like=adminPage.getByRole('button',{name:'♡ Like'}).first();must(await like.count()>0,'peer discoverable to admin');await like.click();await adminPage.waitForTimeout(700);record('admin -> peer Like',true)}
  await gotoOk(peerPage,'/descubrir','peer discover');
  const psearch=peerPage.getByLabel('Buscar perfiles');
  if(await psearch.count()){await psearch.fill(adminName);const like=peerPage.getByRole('button',{name:'♡ Like'}).first();must(await like.count()>0,'admin discoverable to peer');await like.click();await peerPage.getByRole('heading',{name:'¡Hicieron Match!'}).waitFor({timeout:10000});record('mutual Like -> Match',true);await peerPage.getByRole('button',{name:'Enviar mensaje'}).click();await peerPage.waitForURL('**/chats/**',{timeout:15000});record('match -> chat navigation',true,peerPage.url());const input=peerPage.getByLabel(new RegExp(`Mensaje para ${adminName}`));await input.fill(`${reportMarker} mensaje QA sincronizado`);await peerPage.getByRole('button',{name:'Enviar mensaje'}).click();await peerPage.waitForTimeout(1000);must((await peerPage.locator('body').innerText()).includes('mensaje QA sincronizado'),'chat message send')}
}

async function testSafety(peerPage){
  must(peerPage.url().includes('/chats/'),'chat available for safety actions');
  await peerPage.getByRole('button',{name:'Opciones de seguridad'}).click();
  await peerPage.getByRole('button',{name:'Reportar'}).click();
  await peerPage.getByLabel('Motivo').selectOption('other');
  await peerPage.getByLabel('Detalles').fill(`${reportMarker} reporte sintético para validar Trust & Safety.`);
  await peerPage.getByRole('button',{name:'Enviar reporte'}).click();
  await peerPage.getByRole('heading',{name:'Gracias por avisarnos.'}).waitFor({timeout:10000});
  record('safety report submission',true,reportMarker);
  await peerPage.getByRole('button',{name:'Cerrar'}).click();
}

async function resolveQaReport(page){
  await gotoOk(page,'/admin/reports','admin reports queue');
  const row=page.locator('tr',{hasText:reportMarker}).first();
  must(await row.count()>0,'QA report visible in admin queue');
  await row.locator('textarea').fill(`${reportMarker} resolución QA: flujo verificado.`);
  await row.getByRole('button',{name:'Resolver'}).click();
  await page.waitForTimeout(900);
  record('admin report resolution',true,reportMarker);
}

async function testBlockAndUnblock(peerPage,peerContext,adminId){
  await peerPage.getByRole('button',{name:'Opciones de seguridad'}).click();
  await peerPage.getByRole('button',{name:'Bloquear'}).click();
  const dialog=peerPage.getByRole('dialog');
  must(await dialog.count()>0,'block confirmation dialog');
  await dialog.getByRole('button',{name:'Bloquear',exact:true}).click();
  await peerPage.waitForTimeout(800);
  record('safety block action',true);
  const r=await peerContext.request.post(`${base}/api/safety/unblock`,{data:{userId:adminId}});
  must(r.ok(),'safety unblock API',`status=${r.status()}`);
}

async function testDeletionRequestCancel(page,peerId){
  const usersPath=`/admin/users?q=${encodeURIComponent(peerId)}`;
  await gotoOk(page,usersPath,'deletion request target lookup');
  const row=page.locator('tr',{hasText:peerId}).first();
  const details=row.locator('details');
  must(await details.count()>0,'deletion request control available');
  await details.locator('summary').click();
  await details.locator('select[name="reason_code"]').selectOption('other');
  await details.locator('textarea[name="reason_note"]').fill(`${reportMarker} solicitud sintética; cancelar en la misma QA.`);
  await details.locator('input[name="confirmed"]').check();
  await details.getByRole('button',{name:'Crear solicitud'}).click();
  await page.waitForTimeout(900);
  await gotoOk(page,'/admin/operations','deletion job queue after request');
  let jobRow=page.locator('tr',{hasText:peerId}).first();
  must(await jobRow.count()>0,'deletion request reaches operations queue');
  await jobRow.getByRole('button',{name:'Cancelar'}).click();
  await page.waitForTimeout(900);
  await gotoOk(page,'/admin/operations','deletion job queue after cancel');
  jobRow=page.locator('tr',{hasText:peerId}).first();
  must(await jobRow.count()>0&&((await jobRow.innerText()).includes('cancel')||(await jobRow.innerText()).includes('cancelled')),'deletion request can be cancelled');
}

async function testLogoutLoginRoundtrip(page,context){
  await gotoOk(page,'/logout','admin logout');
  await page.waitForTimeout(500);
  let session=await context.request.get(`${base}/api/auth/session`).then(r=>r.json()).catch(()=>null);
  must(session?.authenticated!==true,'logout clears authenticated session');
  await gotoOk(page,'/iniciar-sesion','admin login page after logout');
  await page.locator('input[name="username"]').fill(adminUsername);
  await page.locator('input[name="password"]').fill(adminPassword);
  const toggle=page.getByRole('button',{name:'Mostrar'}).first();
  await toggle.click();
  must(await page.locator('input[name="password"]').getAttribute('type')==='text','password visibility toggle');
  await page.getByRole('button',{name:'Iniciar sesión'}).click();
  await page.waitForURL(url=>!url.pathname.includes('/iniciar-sesion'),{timeout:30000});
  session=await context.request.get(`${base}/api/auth/session`).then(r=>r.json()).catch(()=>null);
  must(session?.authenticated===true&&session?.admin===true,'admin login restores authenticated admin session',page.url());
  await gotoOk(page,'/admin','admin dashboard after re-login');
  await gotoOk(page,'/logout','final admin logout');
}

let browser;
try{
  browser=await chromium.launch({headless:true});
  const publicContext=await browser.newContext({viewport:{width:1440,height:1000}});
  const publicPage=await publicContext.newPage();await testPublic(publicPage);await publicContext.close();
  const adminContext=await browser.newContext({viewport:{width:1440,height:1000}});
  const peerContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const adminPage=await createActiveProfile(adminContext,{username:adminUsername,password:adminPassword,displayName:adminName,gender:'man',wantLabel:'Mujer'});
  const peerPage=await createActiveProfile(peerContext,{username:peerUsername,password:peerPassword,displayName:peerName,gender:'woman',wantLabel:'Hombre'});
  console.log(`QA_ACCOUNTS_CREATED admin=${adminUsername} peer=${peerUsername}`);
  await testPhotoUpload(adminPage,adminUsername);
  await testAccountRoutes(adminPage);await testAccountRoutes(peerPage);
  must(await waitForAdmin(adminContext),'QA admin promotion within validation window',adminUsername);
  await testAdminRoutes(adminPage);
  const adminId=await findAdminUserId(adminPage,adminName);
  const peerId=await findAdminUserId(adminPage,peerName);
  await testPhotoModeration(adminPage,adminId);
  await testUserStatus(adminPage,peerId);
  await testSanction(adminPage,peerId);
  await testDiscoveryAndMatch(adminPage,peerPage);
  await testSafety(peerPage);
  await resolveQaReport(adminPage);
  await testBlockAndUnblock(peerPage,peerContext,adminId);
  await testDeletionRequestCancel(adminPage,peerId);
  await testLogoutLoginRoundtrip(adminPage,adminContext);
  await screenshot(adminPage,'final-admin-logout');await screenshot(peerPage,'final-peer-state');
  report.success=report.steps.every(s=>s.ok);
  await adminContext.close();await peerContext.close();
}catch(error){report.success=false;report.errors.push(String(error?.stack||error));console.error(error)}finally{if(browser)await browser.close().catch(()=>{});await saveReport()}
if(!report.success)process.exit(1);
