import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read=(path:string)=>fs.readFileSync(path,'utf8');

test('production infrastructure probe fails closed instead of reporting false green',()=>{
  const workflow=read('.github/workflows/infra-probe.yml');
  assert.match(workflow,/failed=0/);
  assert.match(workflow,/if \[ "\$failed" -ne 0 \]; then[\s\S]*exit 1/);
  assert.doesNotMatch(workflow,/set \+e/);
  assert.doesNotMatch(workflow,/\n\s*exit 0\s*\n/);
});

test('production infrastructure probe validates canonical public infrastructure without stale deployment pins',()=>{
  const workflow=read('.github/workflows/infra-probe.yml');
  assert.match(workflow,/for host in citafuego\.com www\.citafuego\.com/);
  assert.match(workflow,/https:\/\/\$\{host\}\/api\/health/);
  assert.match(workflow,/api\/ready/);
  assert.match(workflow,/openssl s_client/);
  assert.match(workflow,/vercel-dns/);
  assert.match(workflow,/alidns\.com/);
  assert.doesNotMatch(workflow,/--resolve/);
  assert.doesNotMatch(workflow,/citafuego-prod-2sqlhwb3p/);
  assert.doesNotMatch(workflow,/citafuego-prod-huoago-7712s-projects\.vercel\.app/);
});

test('workflow artifacts use maintained Node 24 compatible action generation',()=>{
  const workflows=[
    read('.github/workflows/ci.yml'),
    read('.github/workflows/infra-probe.yml'),
    read('.github/workflows/seo-quality.yml'),
  ];
  for(const workflow of workflows){
    assert.match(workflow,/actions\/upload-artifact@v7/);
    assert.doesNotMatch(workflow,/actions\/upload-artifact@v4/);
  }
});
