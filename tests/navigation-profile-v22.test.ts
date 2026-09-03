import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync,readdirSync,statSync } from 'node:fs';
import { join } from 'node:path';

const read=(path:string)=>readFileSync(path,'utf8');

function walk(dir:string):string[]{
  return readdirSync(dir).flatMap(name=>{const path=join(dir,name);return statSync(path).isDirectory()?walk(path):[path]});
}

test('root layout renders one universal navigation before every page',()=>{
  const layout=read('src/app/layout.tsx');
  assert.match(layout,/GlobalSiteNav/);
  assert.match(layout,/<GlobalSiteNav\/>\s*\{children\}/);
  const nav=read('src/components/global-site-nav.tsx');
  assert.match(nav,/data-global-site-nav/);
  assert.match(nav,/data-home-link/);
  assert.match(nav,/href="\/"/);
  assert.match(nav,/Inicio/);
  assert.doesNotMatch(nav,/usePathname|use client/);
});

test('homepage does not duplicate the global header',()=>{
  const home=read('src/app/page.tsx');
  assert.doesNotMatch(home,/styles\.header|styles\.headerActions|styles\.publishButton/);
});

test('community guidelines no longer contain the removed paid-sex prohibition',()=>{
  const page=read('src/app/community-guidelines/page.tsx');
  assert.doesNotMatch(page,/Prostitución|escorts|pago por encuentros|servicios sexuales/i);
  assert.match(page,/BackButton/);
});

test('social profile uses media-first directory detail layout and public contact',()=>{
  const page=read('src/app/(app)/perfil/[userId]/page.tsx');
  assert.match(page,/DirectoryProfileGallery/);
  assert.match(page,/pkProfileHero/);
  assert.match(page,/pkProfileCard/);
  assert.match(page,/Contacto compartido/);
  assert.match(page,/Abrir WhatsApp/);
  assert.match(page,/Datos principales/);
  assert.match(page,/Galería/);
});

test('source has no obvious dead placeholder links or empty click handlers',()=>{
  const files=[...walk('src/app'),...walk('src/components')].filter(path=>/\.(tsx|ts|jsx|js)$/.test(path));
  const offenders:string[]=[];
  for(const file of files){
    const source=read(file);
    if(/href=["']#["']/.test(source)||/href=["']["']/.test(source)||/onClick=\{\(\)=>\{\s*\}\}/.test(source))offenders.push(file);
  }
  assert.deepEqual(offenders,[],`Dead interactive placeholders found: ${offenders.join(', ')}`);
});

test('late global stylesheet provides themed controls, focus states and responsive profile layout',()=>{
  const css=read('src/app/v22-global-navigation-profile.css');
  assert.match(css,/globalSiteNav/);
  assert.match(css,/button:disabled/);
  assert.match(css,/focus-visible/);
  assert.match(css,/pkProfileHero/);
  assert.match(css,/pkPhotoStage/);
  assert.match(css,/pkContact/);
  assert.match(css,/@media\(max-width:620px\)/);
});
