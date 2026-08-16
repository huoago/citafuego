import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync,readFileSync } from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');
const migration=()=>read('supabase/migrations/035_personal_blog_social_privacy.sql');

test('personal blog migration has social and privacy models',()=>{const s=migration();for(const token of ['blog_posts','blog_post_viewers','blog_post_media','blog_likes','blog_comments','blog_shares','can_view_blog_post','is_blog_friend'])assert.match(s,new RegExp(token));for(const visibility of ["'public'","'friends'","'selected'","'private'"])assert.match(s,new RegExp(visibility));});
test('blog media stays private and visibility is enforced in storage policy',()=>{const s=migration();assert.match(s,/values\('blog-media','blog-media',false/);assert.match(s,/blog_media_protected_select/);assert.match(s,/can_view_blog_post\(m\.post_id,auth\.uid\(\)\)/);});
test('blog images support baked author watermark and short signed urls',()=>{const sanitizer=read('src/lib/media/sanitize-image.ts');assert.match(sanitizer,/watermarkText/);assert.match(sanitizer,/CitaFuego/);assert.match(sanitizer,/composite/);const server=read('src/lib/blog/server.ts');assert.match(server,/createSignedUrls\(paths, 120\)/);});
test('blog text and comments are moderated before database writes',()=>{const post=read('src/app/api/blog/posts/route.ts');const comment=read('src/app/api/blog/posts/[postId]/comment/route.ts');assert.match(post,/surface: 'blog_post'/);assert.match(comment,/surface:'blog_comment'/);assert.match(post,/content_blocked/);assert.match(comment,/content_blocked/);});
test('blog product surfaces exist',()=>{for(const path of ['src/app/(app)/blog/page.tsx','src/app/(app)/blog/nuevo/page.tsx','src/app/(app)/blog/mio/page.tsx','src/app/(app)/blog/configuracion/page.tsx','src/app/(app)/blog/[postId]/page.tsx','src/components/blog/blog-composer.tsx','src/components/blog/blog-card.tsx','src/components/blog/protected-blog-image.tsx'])assert.equal(existsSync(path),true,path);});
test('protected blog image blocks ordinary save affordances when enabled',()=>{const s=read('src/components/blog/protected-blog-image.tsx');assert.match(s,/onContextMenu/);assert.match(s,/onDragStart/);assert.match(s,/draggable/);assert.match(s,/short-lived signed URLs/);});
