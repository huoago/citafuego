import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

const forbiddenSitemapTokens=[
  '/admin','/api','/chat','/messages','/account','/settings','/verification','/private-album','/album-privado','/perfil','/matches','/likes','/premium','/onboarding','/registro/completar',
];

test('robots and sitemap routes exist',()=>{
  assert.ok(fs.existsSync('src/app/robots.ts'));
  assert.ok(fs.existsSync('src/app/sitemap.ts'));
  assert.ok(fs.existsSync('src/app/not-found.tsx'));
});

test('sitemap source does not enumerate private paths',()=>{
  const source=read('src/app/sitemap.ts');
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

test('global metadata includes canonical, social cards and verification hooks',()=>{
  const source=read('src/app/layout.tsx');
  for(const token of ['metadataBase','alternates','openGraph','twitter','verification','WebSite','Organization'])assert.match(source,new RegExp(token));
});

test('image pipeline negotiates modern formats',()=>{
  const source=read('next.config.ts');
  assert.match(source,/image\/avif/);
  assert.match(source,/image\/webp/);
});
