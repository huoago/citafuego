import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('free main integrity gate fails closed unless GitHub associates the SHA with a merged PR into main', () => {
  const script = read('scripts/check-main-integrity.mjs');
  assert.match(script, /commits\/\$\{sha\}\/pulls\?per_page=100/);
  assert.match(script, /pr\.merged_at/);
  assert.match(script, /pr\.base\?\.ref === targetBranch/);
  assert.match(script, /pr\.base\?\.repo\?\.full_name === repository/);
  assert.match(script, /MAIN_INTEGRITY_BLOCKED/);
  assert.match(script, /GitHub token is unavailable; provenance cannot be verified safely/);
  assert.match(script, /Direct pushes are not production-authorized/);
});

test('main integrity workflow checks every main push, records an incident, and never auto-reverts production state', () => {
  const workflow = read('.github/workflows/main-integrity.yml');
  assert.match(workflow, /name: Main Integrity Gate/);
  assert.match(workflow, /push:\n\s+branches: \[main\]/);
  assert.match(workflow, /pull-requests: read/);
  assert.match(workflow, /issues: write/);
  assert.match(workflow, /node scripts\/check-main-integrity\.mjs/);
  assert.match(workflow, /Unauthorized direct push to main/);
  assert.match(workflow, /Production authorization is denied for this SHA/);
  assert.match(workflow, /Do not auto-revert database migrations or production state/);
  assert.match(workflow, /Block unauthorized main update/);
});

test('production deployment independently verifies PR provenance before installing or contacting Vercel', () => {
  const workflow = read('.github/workflows/production-deploy.yml');
  assert.match(workflow, /pull-requests: read/);
  assert.match(workflow, /Verify main provenance before any production work/);
  assert.match(workflow, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(workflow, /node scripts\/check-main-integrity\.mjs/);

  const provenance = workflow.indexOf('Verify main provenance before any production work');
  const install = workflow.indexOf('Clean install');
  const deploy = workflow.indexOf('Create production deployment through Vercel API');
  assert.ok(provenance >= 0 && install > provenance, 'provenance gate must run before npm install');
  assert.ok(deploy > provenance, 'provenance gate must run before Vercel production creation');
});

test('manual self-heal redeploy cannot bypass the production provenance gate', () => {
  const production = read('.github/workflows/production-deploy.yml');
  const health = read('.github/workflows/daily-health.yml');
  assert.match(production, /workflow_dispatch:/);
  assert.match(production, /Verify main provenance before any production work/);
  assert.match(health, /gh workflow run production-deploy\.yml --repo "\$GITHUB_REPOSITORY" --ref main/);
});
