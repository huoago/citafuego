import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const siteUrl=process.env.SEARCH_CONSOLE_SITE_URL||'https://citafuego.com/';
const sitemapUrl=new URL('/sitemap.xml',siteUrl).toString();

async function fetchSitemapUrls(){
  const response=await fetch(sitemapUrl,{headers:{'user-agent':'CitaFuego-Search-Submit/1.0'}});
  if(!response.ok)throw new Error(`Unable to read sitemap (${response.status})`);
  const xml=await response.text();
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match)=>match[1]);
}

function base64url(value){return Buffer.from(value).toString('base64url');}
async function googleAccessToken(serviceAccount){
  const now=Math.floor(Date.now()/1000);
  const header=base64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const claims=base64url(JSON.stringify({
    iss:serviceAccount.client_email,
    scope:'https://www.googleapis.com/auth/webmasters',
    aud:serviceAccount.token_uri||'https://oauth2.googleapis.com/token',
    iat:now,
    exp:now+3600,
  }));
  const input=`${header}.${claims}`;
  const signature=crypto.sign('RSA-SHA256',Buffer.from(input),serviceAccount.private_key).toString('base64url');
  const assertion=`${input}.${signature}`;
  const tokenResponse=await fetch(serviceAccount.token_uri||'https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),
  });
  const body=await tokenResponse.json().catch(()=>({}));
  if(!tokenResponse.ok||!body.access_token)throw new Error(`Google OAuth failed (${tokenResponse.status}): ${JSON.stringify(body)}`);
  return body.access_token;
}

async function submitGoogle(){
  const raw=process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON?.trim();
  if(!raw){console.log('Google Search Console service account is not configured; skipping API sitemap submission.');return;}
  const credentials=JSON.parse(raw);
  const token=await googleAccessToken(credentials);
  const endpoint=`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
  const response=await fetch(endpoint,{method:'PUT',headers:{authorization:`Bearer ${token}`}});
  if(!response.ok)throw new Error(`Google Search Console sitemap submission failed (${response.status}): ${await response.text()}`);
  console.log('Google Search Console sitemap submission succeeded.');
}

async function submitBing(){
  const apiKey=process.env.BING_WEBMASTER_API_KEY?.trim();
  if(!apiKey){console.log('Bing Webmaster API key is not configured; skipping sitemap submission.');return;}
  const endpoint=new URL('https://ssl.bing.com/webmaster/api.svc/json/SubmitSiteMap');
  endpoint.searchParams.set('apikey',apiKey);
  endpoint.searchParams.set('siteUrl',siteUrl);
  endpoint.searchParams.set('feedUrl',sitemapUrl);
  const response=await fetch(endpoint,{method:'POST'});
  if(!response.ok)throw new Error(`Bing Webmaster sitemap submission failed (${response.status}): ${await response.text()}`);
  console.log('Bing Webmaster sitemap submission succeeded.');
}

const urls=await fetchSitemapUrls();
if(urls.length<50)throw new Error(`Refusing search submission: sitemap has only ${urls.length} URLs`);
const forbidden=['/admin','/api','/chat','/messages','/account','/settings','/verification','/private-album','/album-privado','/perfil','/matches','/likes','/premium','/onboarding','/registro/completar'];
for(const url of urls){
  const path=new URL(url).pathname;
  if(forbidden.some((prefix)=>path.startsWith(prefix)))throw new Error(`Private URL leaked into sitemap: ${url}`);
}

await submitGoogle();
await submitBing();

if(process.env.INDEXNOW_KEY){
  const result=spawnSync(process.execPath,['scripts/indexnow-submit.mjs',...urls],{stdio:'inherit',env:process.env});
  if(result.status!==0)process.exit(result.status??1);
}else console.log('INDEXNOW_KEY is not configured; skipping IndexNow.');

console.log(`Search-engine submission gate completed for ${urls.length} public URLs.`);
