import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route=fs.readFileSync('src/app/api/admin/sanctions/route.ts','utf8');
const form=fs.readFileSync('src/components/admin/sanction-form.tsx','utf8');

test('admin sanction API matches the production RPC signature',()=>{
  assert.match(route,/rpc\('admin_apply_sanction',[\s\S]*p_hours:hours/);
  assert.doesNotMatch(route,/p_ends_at/);
  assert.match(route,/admin_apply_sanction/);
});

test('sanction end time is interpreted as Lima time and validated before the RPC',()=>{
  assert.match(route,/America\/Lima/);
  assert.match(route,/`\$\{endsAt\}-05:00`/);
  assert.match(route,/Math\.ceil\(milliseconds\/3_600_000\)/);
  assert.match(route,/hours>=1&&hours<=8760/);
  assert.match(route,/invalid_end_time/);
  assert.match(form,/Fin \(opcional · hora de Lima\)/);
});

test('indefinite sanctions remain supported when no end time is supplied',()=>{
  assert.match(route,/if\(!endsAt\)return null/);
  assert.match(route,/p_hours:hours/);
});
