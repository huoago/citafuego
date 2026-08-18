import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(path,'utf8');

const creatorRoutes=[
  'src/app/api/creators/apply/route.ts',
  'src/app/api/creators/payout/route.ts',
  'src/app/api/creators/commercial-payout/route.ts',
  'src/app/api/creators/compliance/route.ts',
  'src/app/api/creators/brand/apply/route.ts',
];

test('creator program is closed by default and requires explicit production enablement',()=>{
  const feature=read('src/lib/features/creator-program.ts');
  assert.match(feature,/process\.env\.CREATOR_PROGRAM_ENABLED === 'true'/);
  assert.match(feature,/creator_program_temporarily_closed/);
});

test('all user creator pages are covered by the creator layout gate',()=>{
  const layout=read('src/app/(app)/creadores/layout.tsx');
  assert.match(layout,/isCreatorProgramEnabled/);
  assert.match(layout,/CreatorProgramClosed/);
});

test('all user creator mutation APIs fail closed before business logic',()=>{
  for(const path of creatorRoutes){
    const source=read(path);
    assert.match(source,/if\(!isCreatorProgramEnabled\(\)\)return creatorProgramClosedResponse\(\)/,path);
  }
});

test('creator monetization stays off the main profile and remains feature-gated in secondary settings',()=>{
  const profile=read('src/app/(app)/perfil/page.tsx');
  const more=read('src/app/(app)/perfil/mas/page.tsx');
  assert.doesNotMatch(profile,/href="\/creadores/);
  assert.match(more,/isCreatorProgramEnabled/);
  assert.match(more,/creatorProgramEnabled\?<></);
  assert.match(more,/Centro de creadores/);
  assert.match(more,/Monetización y KYC/);
  assert.match(more,/Oportunidades de marca/);
});

test('database migration revokes direct authenticated RPC access while preserving service role operations',()=>{
  const sql=read('supabase/migrations/052_temporarily_close_creator_program.sql');
  for(const fn of ['apply_creator_program','request_creator_payout','request_commercial_creator_payout','submit_creator_compliance','apply_brand_opportunity']){
    assert.match(sql,new RegExp(`revoke execute on function public\\.${fn}`),fn);
  }
  assert.doesNotMatch(sql,/revoke execute[\s\S]+from service_role/i);
});
