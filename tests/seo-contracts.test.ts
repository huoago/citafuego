import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

const forbiddenSitemapTokens=[
  '/admin','/api','/chat','/messages','/account','/settings','/verification','/private-album','/album-privado','/perfil','/matches','/likes','/premium','/onboarding','/registro/completar',
];

function extractQuotedArray(source:string,name:string){
  const match=source.match(new RegExp(`export const ${name}=\\[([\\s\\S]*?)\\];`));
  assert.ok(match,`${name} array not found`);
  return [...match[1].matchAll(/'([^']+)'/g)].map(item=>item[1]);
}

test('robots and sitemap routes exist',()=>{
  assert.ok(fs.existsSync('src/app/robots.ts'));
  assert.ok(fs.existsSync('src/app/sitemap.ts'));
  assert.ok(fs.existsSync('src/app/not-found.tsx'));
});

test('SEO registry uses the production apex origin and never overlaps private routes',()=>{
  const source=read('src/lib/seo.ts');
  assert.match(source,/export const SITE_URL='https:\/\/citafuego\.com'/);
  const publicRoutes=extractQuotedArray(source,'PUBLIC_INDEXABLE_ROUTES');
  const privatePrefixes=extractQuotedArray(source,'PRIVATE_ROUTE_PREFIXES');
  assert.ok(publicRoutes.length>0,'public SEO registry is empty');
  for(const path of publicRoutes){
    assert.ok(path==='/'||path.startsWith('/'),`invalid public route ${path}`);
    for(const prefix of privatePrefixes){
      assert.equal(path===prefix||path.startsWith(`${prefix}/`),false,`public route ${path} overlaps private prefix ${prefix}`);
    }
  }
});

test('sitemap source does not fabricate last-modified timestamps or enumerate private paths',()=>{
  const source=read('src/app/sitemap.ts');
  assert.doesNotMatch(source,/lastModified|new Date\s*\(/,'sitemap must only publish authoritative last-modified timestamps');
  for(const token of forbiddenSitemapTokens)assert.equal(source.includes(`'${token}`),false,`private path ${token} must not be hard-coded into sitemap`);
});

test('robots declares sitemap and private exclusions',()=>{
  const source=read('src/app/robots.ts');
  assert.match(source,/sitemap:/);
  for(const token of ['/admin/','/api/','/chat/','/perfil/','/onboarding/'])assert.match(source,new RegExp(token.replaceAll('/','\\/')));
});

test('legacy auth links permanently redirect to Spanish canonical routes',()=>{
  const source=read('next.config.ts');
  for(const legacy of ['/login','/signup','/register'])assert.match(source,new RegExp(legacy));
  assert.match(source,/destination:'\/iniciar-sesion'/);
  assert.match(source,/destination:'\/registro'/);
  assert.match(source,/permanent:true/);
});

test('www production traffic is permanently normalized to the apex canonical domain',()=>{
  const source=read('src/proxy.ts');
  assert.match(source,/www\.citafuego\.com/);
  assert.match(source,/hostname='citafuego\.com'/);
  assert.match(source,/NextResponse\.redirect\(url,308\)/);
});

test('global metadata includes canonical, social cards and verification hooks',()=>{
  const source=read('src/app/layout.tsx');
  for(const token of ['metadataBase','alternates','openGraph','twitter','verification','WebSite','Organization'])assert.match(source,new RegExp(token));
});

test('image pipeline negotiates modern formats',()=>{
  const source=read('next.config.ts');
  assert.match(source,/image\/avif/);
  assert.match(source,/image\/webp/);
});
