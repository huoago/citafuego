import {chromium} from 'playwright';
import {createServerClient} from '@supabase/ssr';

const BASE='https://citafuego.com';
const SUPABASE_URL='https://stfbybkutnoqoxhqxyou.supabase.co';
const SUPABASE_KEY='sb_publishable_bzwmFw6D6rx0X4D5VWonhA_hkxf9c4d';
const account={email:process.env.CF_QA_MEMBER_EMAIL,password:process.env.CF_QA_MEMBER_PASSWORD};
if(!account.email||!account.password)throw new Error('Missing member QA credentials');

async function authCookies(){
 const jar=[];
 const client=createServerClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:false},cookies:{getAll(){return jar.map(({name,value})=>({name,value}));},setAll(next){for(const cookie of next){const i=jar.findIndex(x=>x.name===cookie.name);if(i>=0)jar[i]=cookie;else jar.push(cookie);}}}});
 const{data,error}=await client.auth.signInWithPassword({email:account.email,password:account.password});
 if(error||!data.session)throw new Error(`Member login failed: ${error?.message??'no session'}`);
 return jar;
}
function pwCookies(jar){return jar.filter(x=>x.value).map(item=>{const raw=String(item.options?.sameSite??'lax').toLowerCase();return{name:item.name,value:item.value,domain:'citafuego.com',path:item.options?.path??'/',httpOnly:Boolean(item.options?.httpOnly),secure:true,sameSite:raw==='strict'?'Strict':raw==='none'?'None':'Lax'};});}
async function session(page,label){const r=await page.evaluate(async()=>{const res=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});return{status:res.status,body:await res.json().catch(()=>({}))};});return{label,...r};}
async function api(page,path,options={}){return page.evaluate(async({path,options})=>{const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{'content-type':'application/json',...(options.headers||{})}});return{status:r.status,body:await r.json().catch(()=>({})),hasSetCookie:r.headers.has('set-cookie')};},{path,options});}

const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},userAgent:'CitaFuego Session Continuity QA/2026.09'});
 await context.addCookies(pwCookies(await authCookies()));
 const page=await context.newPage();
 const checkpoints=[];
 checkpoints.push(await session(page,'fresh-login'));
 const adminResponse=await page.goto(`${BASE}/admin`,{waitUntil:'domcontentloaded'});
 checkpoints.push({label:'admin-page-response',status:adminResponse?.status()??0,url:page.url(),setCookieHeader:Boolean(adminResponse?.headers()['set-cookie'])});
 checkpoints.push(await session(page,'after-admin-page'));
 const adminApi=await api(page,'/api/admin/commercialization/compliance',{method:'POST',body:'{}'});
 checkpoints.push({label:'admin-api',...adminApi});
 checkpoints.push(await session(page,'after-admin-api'));
 const interaction=await api(page,'/api/interactions',{method:'POST',body:JSON.stringify({toUserId:process.env.CF_QA_MEMBER_ID,action:'like'})});
 checkpoints.push({label:'self-interaction',...interaction});
 checkpoints.push(await session(page,'after-interaction'));
 const cookieNames=(await context.cookies(BASE)).map(c=>({name:c.name,domain:c.domain,path:c.path,expires:c.expires,httpOnly:c.httpOnly,secure:c.secure,sameSite:c.sameSite}));
 const states=checkpoints.filter(x=>x.label.includes('login')||x.label.startsWith('after-')).map(x=>({label:x.label,authenticated:x.body?.authenticated,admin:x.body?.admin,status:x.status}));
 const continuity=states.every(x=>x.authenticated===true&&x.admin===false);
 console.log('CF_SESSION_PROBE '+JSON.stringify({ok:continuity,states,adminPage:checkpoints.find(x=>x.label==='admin-page-response'),adminApiStatus:adminApi.status,selfInteractionStatus:interaction.status,cookieMetadata:cookieNames}));
 if(!continuity)process.exitCode=1;
 await context.close();
}finally{await browser.close();}
