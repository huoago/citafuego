import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');
const exists=(path:string)=>existsSync(join(root,path));
type Check={name:string;weight:number;pass:boolean};

function contains(path:string,...parts:string[]){const source=read(path);return parts.every(part=>source.includes(part));}
function routesExist(routes:string[]){return routes.every(route=>exists(`src/app/${route}/page.tsx`)||exists(`src/app/(app)/${route}/page.tsx`)||exists(`src/app/(auth)/${route}/page.tsx`));}

test('release quality score is at least 95/100',()=>{
 const checks:Check[]=[
  {name:'public feature pages are independent routes',weight:5,pass:routesExist(['swipe','verificacion','chat-privado','random-connect','para-ti-info','stories-info','blog-info','album-privado','match-intelligence','premium-info','seguridad-privacidad'])},
  {name:'registration login onboarding and activation endpoints exist',weight:5,pass:routesExist(['registro','iniciar-sesion','onboarding'])&&exists('src/app/api/auth/register/route.ts')&&exists('src/app/api/auth/login/route.ts')&&exists('src/app/api/onboarding/activate/route.ts')},
  {name:'real social product surfaces exist',weight:5,pass:routesExist(['comunidad','para-ti','descubrir','matches','likes','chats','perfil','stories','blog','guardados','albumes'])},
  {name:'dating interactions are wired to server APIs',weight:5,pass:contains('src/components/discover-deck.tsx','/api/interactions','/api/rewind',"decide('like')", "decide('pass')")&&contains('src/components/likes-grid.tsx','/api/interactions')},
  {name:'matched chat is durable moderated and synchronized',weight:5,pass:contains('src/app/(app)/chats/[conversationId]/page.tsx','ServerChat',"from('messages')")&&contains('src/app/api/messages/route.ts','submit_message','preModerateText','message_rate_limited')&&exists('src/components/chat/server-chat.tsx')},
  {name:'production smoke spans public and protected journeys',weight:5,pass:contains('e2e/production-smoke.mjs','publicChecks','protectedChecks','/para-ti-info','/seguridad-privacidad','/matches','auth redirect')},

  {name:'community combines stories creation interests and conversation feed',weight:5,pass:contains('src/app/(app)/comunidad/page.tsx','/stories','/blog/nuevo','Intereses que conectan','BlogCard')},
  {name:'blog interactions expose like bookmark share comments and reports',weight:5,pass:contains('src/components/blog/blog-card.tsx','/like','/api/social/bookmark','navigator.share','#comentarios','ReportContentButton')},
  {name:'stories record views and expose safety reporting',weight:5,pass:contains('src/components/stories/story-card.tsx','/view','ReportContentButton','24h')},
  {name:'one-way follows and Match-only areas remain distinct in product code',weight:5,pass:contains('src/app/(app)/para-ti/page.tsx','FollowButton','Matches potenciales')&&contains('src/components/blog/blog-card.tsx',"friends:'Solo Matches'")},

  {name:'registration enforces adult gate antibot and legal configuration',weight:5,pass:contains('src/app/api/auth/register/route.ts','isAdultBirthDate','verifyTurnstile','legal_document_versions','acceptedSensitive')},
  {name:'private media migrations explicitly keep buckets non-public',weight:5,pass:contains('supabase/migrations/035_personal_blog_social_privacy.sql',"'blog-media'",'false')&&contains('supabase/migrations/037_social_profiles_follows_mentions_stories.sql',"'story-media'",'false')&&contains('supabase/migrations/058_private_match_albums.sql',"'private-albums'",'false')},
  {name:'authenticated shell gates onboarding and restricted accounts',weight:5,pass:contains('src/app/(app)/layout.tsx',"redirect('/iniciar-sesion')","redirect('/onboarding')","redirect('/cuenta-restringida')")},
  {name:'block report and moderation safety contracts remain present',weight:5,pass:exists('src/components/social/report-content-button.tsx')&&exists('src/app/admin/reports/page.tsx')&&contains('tests/security-contracts.test.ts','block')},

  {name:'iOS-style tab bar has five Social V2 top-level destinations',weight:5,pass:contains('src/components/bottom-nav.tsx',"'/descubrir'","'/comunidad'","'/matches'","'/chats'","'/perfil'",'aria-current')},
  {name:'iOS V2 layer covers safe areas blur touch targets themes and reduced motion',weight:5,pass:contains('src/app/ios-v2.css','env(safe-area-inset-bottom)','backdrop-filter','min-height:44px','prefers-reduced-motion','prefers-color-scheme:light')},
  {name:'auth UX has grouped consent trust and accessible status feedback',weight:5,pass:contains('src/components/auth/register-form.tsx','legalGroup','role="status"','role="alert"')&&contains('src/app/(auth)/registro/page.tsx','authTrust','Sin contraseña')},
  {name:'public homepage retains complete feature navigation and demo honesty',weight:5,pass:contains('src/app/page.tsx','PublicFeatureNav','publicFeatures','Demo · datos de ejemplo','Crear mi perfil')},

  {name:'CI runs lint typecheck unit contracts and production build',weight:5,pass:contains('.github/workflows/ci.yml','npm run lint','npm run typecheck','npm test','npm run build')},
  {name:'production workflow validates READY aliases identity and smoke',weight:5,pass:contains('.github/workflows/production-deploy.yml','READY','aliases','CitaFuego','Public production smoke')},
 ];
 const total=checks.reduce((sum,check)=>sum+(check.pass?check.weight:0),0);
 const failed=checks.filter(check=>!check.pass);
 console.log(`CitaFuego internal release quality score: ${total}/100`);
 for(const check of failed)console.log(`- missing ${check.weight} pts: ${check.name}`);
 assert.ok(total>=95,`release quality score ${total}/100 is below 95; failed: ${failed.map(x=>x.name).join('; ')}`);
});
