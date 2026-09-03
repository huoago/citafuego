import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read=(p:string)=>fs.readFileSync(p,'utf8');
const productionControlCss='src/app/control-contrast-brand.css';

test('mascot is the production site logo and has reduced-motion-safe animation',()=>{
  assert.ok(fs.existsSync('public/mascot-logo.svg'));
  const layout=read('src/app/layout.tsx');const nav=read('src/components/global-site-nav.tsx');const css=read(productionControlCss);
  assert.match(layout,/import '\.\/control-contrast-brand\.css'/);assert.match(layout,/mascot-logo\.svg/);assert.match(nav,/globalSiteBrandMascot/);assert.match(css,/mascot-logo\.svg/);assert.match(css,/@keyframes cfMascotFloat/);assert.match(css,/prefers-reduced-motion:reduce/);
});

test('global control contrast explicitly prevents light-on-light form states',()=>{
  const css=read(productionControlCss);
  assert.match(css,/input:not\(\[type="hidden"\]\)/);assert.match(css,/background:var\(--cf-readable-bg\)!important/);assert.match(css,/-webkit-text-fill-color:var\(--cf-readable-text\)!important/);assert.match(css,/input::placeholder/);assert.match(css,/select option/);assert.match(css,/input:disabled,select:disabled,textarea:disabled/);
});

test('admin navigation is a left collapsible sidebar with bilingual and edit-mode controls',()=>{
  const nav=read('src/components/admin/admin-nav.tsx');const layout=read('src/app/admin/layout.tsx');const css=read('src/app/admin/admin-backoffice.css');
  assert.match(nav,/adminSidebar/);assert.match(nav,/aria-expanded=\{expanded\}/);assert.match(nav,/toggle\(group\.id\)/);assert.match(layout,/AdminLanguageSwitch/);assert.match(layout,/AdminFormMode/);assert.match(layout,/AdminContextControls/);assert.match(css,/grid-template-columns:240px minmax\(0,1fr\)/);
});

test('admin deletion no longer asks operators to type destructive confirmation words',()=>{
  const users=read('src/app/admin/users/page.tsx');const operations=read('src/app/admin/operations/page.tsx');
  assert.doesNotMatch(users,/pattern="CONFIRM"/);assert.doesNotMatch(operations,/pattern="DELETE"/);assert.match(users,/name="confirmed" value="yes" required/);assert.match(operations,/name="confirmed" value="yes" required/);assert.match(users,/p_confirmation:'CONFIRM'/);assert.match(operations,/p_confirmation:'DELETE'/);
});

test('manual membership grants target a specific user and duration and remain audited',()=>{
  const page=read('src/app/admin/memberships/page.tsx');const migration=read('supabase/migrations/20260903194409_admin_manual_membership_grants_v1.sql');const searchMigration=read('supabase/migrations/20260903203250_admin_membership_recipient_search_v3.sql');
  assert.match(page,/admin_grant_membership/);assert.match(page,/admin_search_membership_recipients/);assert.match(page,/name="user_id"/);assert.match(page,/name="duration_days"/);assert.match(page,/Fuego Plus/);assert.match(page,/Fuego Gold/);assert.match(migration,/admin_membership_grants/);assert.match(migration,/membership_granted/);assert.match(migration,/p_duration_days<1 or p_duration_days>3650/);assert.match(migration,/provider='admin_manual'/);assert.match(searchMigration,/array\['super_admin','finance'\]/);
});

test('Recommendation V3 renders a visual mix and never dumps allocation JSON',()=>{
  const page=read('src/app/admin/recommendations/page.tsx');
  assert.match(page,/recommendationMix/);assert.match(page,/Distribución de mezcla/);assert.doesNotMatch(page,/JSON\.stringify\(e\.allocation/);assert.doesNotMatch(page,/<pre>\{JSON\.stringify/);
});

test('Lima location control plane contains all 43 districts and supports manual cities',()=>{
  const page=read('src/app/admin/locations/page.tsx');const migration=read('supabase/migrations/20260903195941_admin_control_plane_expansion_v3.sql');
  assert.match(page,/Lima \{lima\.length\}\/43/);assert.match(page,/admin_create_location/);assert.match(page,/admin_update_location_v3/);assert.match(migration,/admin_get_location_metrics_v3/);assert.match(migration,/Villa María del Triunfo/);assert.match(migration,/Ancón/);
  const rows=[...migration.matchAll(/^\('[a-z0-9-]+','[^']+','soft_open'/gm)];assert.equal(rows.length,43,'expected 43 seeded Lima district rows');
});

test('content center displays social posts and automatic violations without auto deletion',()=>{
  const page=read('src/app/admin/content/page.tsx');const migration=read('supabase/migrations/20260903195941_admin_control_plane_expansion_v3.sql');const runtime=read('supabase/migrations/20260903201511_content_moderation_trigger_runtime_fix_v3.sql');const lock=read('supabase/migrations/20260903203712_lock_content_moderation_trigger_functions_v3.sql');
  assert.match(page,/admin_get_content_feed_v3/);assert.match(page,/CONTENT_AUTO_MODERATION_ENABLED/);assert.match(page,/Volver a analizar/);assert.match(migration,/content_rule_scan/);assert.match(migration,/auto_moderate_social_text/);assert.match(migration,/human_review/);assert.match(runtime,/tg_op='INSERT'/);assert.doesNotMatch(migration,/delete from public\.blog_posts/);assert.match(lock,/revoke all on function public\.auto_moderate_social_text\(\)/);assert.match(lock,/revoke all on function public\.log_auto_moderation_event\(\)/);
});

test('commercial media payment and auth modules expose audited operational switches',()=>{
  const controls=read('src/components/admin/admin-context-controls.tsx');
  for(const flag of ['ADS_ENABLED','PAYMENTS_ENABLED','MEMBERSHIP_ENABLED','COMMERCIALIZATION_ENABLED','CREATOR_REWARDS_ENABLED','CREATOR_PAYOUTS_ENABLED','ADVERTISER_SELF_SERVICE_ENABLED','BRAND_MARKETPLACE_ENABLED','COMMERCIAL_FRAUD_MONITOR_ENABLED','EXOCLICK_ENABLED','SEGPAY_ENABLED','BLOG_MEDIA_ENABLED','STORY_MEDIA_ENABLED','ACCOUNT_LOGIN_ENABLED','EMAIL_LOGIN_ENABLED','EMAIL_REGISTRATION_ENABLED','GOOGLE_LOGIN_ENABLED'])assert.match(controls,new RegExp(flag));
  assert.match(controls,/admin_set_feature_flag/);
});

test('blog and story media switches are enforced by upload APIs',()=>{
  assert.match(read('src/app/api/blog/media/start/route.ts'),/BLOG_MEDIA_ENABLED/);
  assert.match(read('src/app/api/stories/media/start/route.ts'),/STORY_MEDIA_ENABLED/);
});

test('auth switches are enforced by readiness and login APIs',()=>{
  const readiness=read('src/lib/auth/provider-readiness.ts');assert.match(readiness,/ACCOUNT_LOGIN_ENABLED/);assert.match(readiness,/EMAIL_REGISTRATION_ENABLED/);assert.match(readiness,/GOOGLE_LOGIN_ENABLED/);
  assert.match(read('src/app/api/auth/account/login/route.ts'),/ACCOUNT_LOGIN_ENABLED/);assert.match(read('src/app/api/auth/login/route.ts'),/EMAIL_LOGIN_ENABLED/);assert.match(read('src/app/api/auth/register/route.ts'),/EMAIL_REGISTRATION_ENABLED/);
});

test('provider and payment configuration runtime fixes are persisted',()=>{
  const migration=read('supabase/migrations/20260903195941_admin_control_plane_expansion_v3.sql');const payment=read('supabase/migrations/20260903200757_admin_payment_visibility_v3.sql');const google=read('supabase/migrations/20260903201409_google_oauth_callback_fix_v3.sql');
  assert.match(migration,/grant execute on function public\.admin_get_provider_config_status\(\) to authenticated/);assert.match(migration,/grant execute on function public\.admin_get_monetization_metrics\(integer\) to authenticated/);assert.match(migration,/provider_credentials_complete/);assert.match(payment,/purchases_admin_read/);assert.match(payment,/subscriptions_admin_read/);assert.match(google,/stfbybkutnoqoxhqxyou\.supabase\.co\/auth\/v1\/callback/);
});

test('system health has clickable diagnostics and documents daily self-heal',()=>{
  const health=read('src/app/admin/health/page.tsx');const workflow=read('.github/workflows/daily-health.yml');
  assert.match(health,/adminHealthProbe/);assert.match(health,/<details/);assert.match(health,/Inspección diaria y autorreparación/);assert.match(health,/08:00 de Lima/);assert.match(workflow,/cron:/);assert.match(workflow,/self-heal/i);
});

function walk(dir:string,files:string[]=[]){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full,files);else if(/\.(ts|tsx)$/.test(entry.name))files.push(full);}return files;}

test('public product source contains no Chinese UI copy',()=>{
  const roots=['src/app','src/components'];const offenders:string[]=[];
  for(const root of roots){for(const file of walk(root)){const normalized=file.replaceAll('\\','/');if(normalized.includes('/admin/'))continue;const source=read(file);if(/[\u3400-\u9fff]/.test(source))offenders.push(normalized);}}
  assert.deepEqual(offenders,[],`Chinese UI copy found outside admin: ${offenders.join(', ')}`);
});
