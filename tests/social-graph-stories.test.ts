import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync,readFileSync } from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');
const migration=()=>read('supabase/migrations/037_social_profiles_follows_mentions_stories.sql');

test('social graph and ephemeral story schema are present',()=>{const s=migration();for(const token of ['social_follows','social_handles','blog_bookmarks','content_mentions','stories','story_viewers','story_media','story_views','can_view_social_profile','can_view_story'])assert.match(s,new RegExp(token));});
test('following does not grant Match-only blog visibility',()=>{const s=migration();assert.match(s,/comment on table public\.social_follows is 'One-way social follows; does not grant Match-only blog visibility\.'/);assert.match(read('supabase/migrations/035_personal_blog_social_privacy.sql'),/visibility='friends'.*is_blog_friend/s);});
test('stories expire after 24 hours and feed excludes expired rows',()=>{const s=migration();assert.match(s,/expires_at=now\(\)\+interval '24 hours'/);assert.match(s,/s\.expires_at>now\(\)/);});
test('story media storage remains private and server-authorized',()=>{const s=migration();assert.match(s,/values\('story-media','story-media',false/);assert.match(s,/story_media_protected_select/);assert.match(s,/can_view_story\(sm\.story_id,auth\.uid\(\)\)/);});
test('mentions only notify viewers who are authorized for the content',()=>{const s=migration();assert.match(s,/sync_social_mentions/);assert.match(s,/allowed:=case p_type when 'blog_post' then public\.can_view_blog_post/);assert.match(s,/@\(\[A-Za-z0-9_\]/);});
test('threaded comments, social reporting and bookmarks are wired',()=>{const s=migration();assert.match(s,/parent_comment_id uuid references public\.blog_comments/);assert.match(s,/report_social_content/);assert.match(s,/toggle_blog_bookmark/);assert.match(s,/toggle_social_follow/);});
test('blog and story media accept private video uploads without storage move requirement',()=>{const blog=read('src/app/api/blog/media/complete/route.ts');const story=read('src/app/api/stories/media/complete/route.ts');assert.doesNotMatch(blog,/\.move\(/);assert.doesNotMatch(story,/\.move\(/);assert.match(read('src/app/api/blog/media/start/route.ts'),/video\/mp4/);assert.match(read('src/app/api/stories/media/start/route.ts'),/video\/mp4/);});
test('integrated profile and social product surfaces exist',()=>{for(const path of ['src/app/(app)/perfil/[userId]/page.tsx','src/app/(app)/perfil/[userId]/[list]/page.tsx','src/app/(app)/guardados/page.tsx','src/app/(app)/stories/page.tsx','src/app/(app)/stories/nuevo/page.tsx','src/components/social/follow-button.tsx','src/components/social/report-content-button.tsx'])assert.equal(existsSync(path),true,path);});
