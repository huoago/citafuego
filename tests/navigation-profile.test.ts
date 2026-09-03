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

test('authenticated shell brand also returns to the public homepage',()=>{
  const shell=read('src/components/mobile-shell.tsx');
  assert.match(shell,/<Link href="\/" className="brandMini" aria-label="CitaFuego Inicio">/);
  assert.doesNotMatch(shell,/className="brandMini"[^>]+href="\/descubrir"/);
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

test('social profile uses media-first directory detail layout and privacy-safe contact',()=>{
  const page=read('src/app/(app)/perfil/[userId]/page.tsx');
  assert.match(page,/DirectoryProfileGallery/);
  assert.match(page,/pkProfileHero/);
  assert.match(page,/pkProfileCard/);
  assert.match(page,/Contacto compartido/);
  assert.match(page,/bundle\.whatsapp\?/);
  assert.match(page,/Número publicado voluntariamente por esta persona/);
  assert.match(page,/pkMobileActions/);
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

test('semantic shell and profile styles provide controls, focus states and responsive profile layout',()=>{
  const shell=read('src/app/site-shell.css');
  const profile=read('src/app/profile-directory.css');
  assert.match(shell,/globalSiteNav/);
  assert.match(shell,/button:disabled/);
  assert.match(shell,/focus-visible/);
  assert.match(shell,/--cf-site-nav-height/);
  assert.match(profile,/pkProfileHero/);
  assert.match(profile,/pkPhotoStage/);
  assert.match(profile,/pkContact/);
  assert.match(profile,/pkMobileActions/);
  assert.match(profile,/@media\(max-width:620px\)/);
});
