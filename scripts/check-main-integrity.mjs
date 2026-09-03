#!/usr/bin/env node

const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';
const repository = process.env.GITHUB_REPOSITORY;
const sha = process.env.GITHUB_SHA;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const targetBranch = process.env.MAIN_INTEGRITY_TARGET || 'main';

function fail(message) {
  console.error(`MAIN_INTEGRITY_BLOCKED: ${message}`);
  process.exit(1);
}

if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) {
  fail('GITHUB_REPOSITORY is missing or invalid.');
}
if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) {
  fail('GITHUB_SHA is missing or invalid.');
}
if (!token) {
  fail('GitHub token is unavailable; provenance cannot be verified safely.');
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'citafuego-main-integrity-gate',
};

const url = `${apiBase}/repos/${repository}/commits/${sha}/pulls?per_page=100`;
let response;
try {
  response = await fetch(url, { headers });
} catch (error) {
  fail(`GitHub provenance API request failed: ${error instanceof Error ? error.message : String(error)}`);
}

if (!response.ok) {
  const detail = (await response.text()).slice(0, 500);
  fail(`GitHub provenance API returned HTTP ${response.status}: ${detail}`);
}

let pulls;
try {
  pulls = await response.json();
} catch {
  fail('GitHub provenance API returned invalid JSON.');
}

if (!Array.isArray(pulls)) {
  fail('GitHub provenance API returned an unexpected payload.');
}

const merged = pulls.find((pr) => (
  pr &&
  pr.merged_at &&
  pr.base?.ref === targetBranch &&
  pr.base?.repo?.full_name === repository
));

if (!merged) {
  fail(`Commit ${sha} is not associated with a merged pull request into ${targetBranch}. Direct pushes are not production-authorized.`);
}

console.log(`MAIN_INTEGRITY_OK: ${sha} entered ${targetBranch} through merged PR #${merged.number}.`);
