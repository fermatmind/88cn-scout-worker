import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeDomain, normalizeGithubRepoUrl, normalizeProjectName } from '../../src/canonical/normalizers.mjs';
import { resolveCanonicalCandidates, runCanonicalEntityDryRun } from '../../src/canonical/canonical-resolver.mjs';

assert.equal(normalizeProjectName('Aurora Code, Inc.'), 'aurora code');
assert.equal(normalizeDomain('https://www.Example.com/path?q=1'), 'example.com');
assert.equal(normalizeGithubRepoUrl('https://github.com/Example/Aurora-Code.git'), 'github.com/example/aurora-code');

const fixturePath = new URL('../../fixtures/canonical/sample-candidates.json', import.meta.url);
const rows = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const results = resolveCanonicalCandidates(rows);

assert.equal(results.length, 7);
assert.equal(results.every((row) => row.auto_publish === false), true);
assert.equal(results.every((row) => row.public_projection === false), true);

const oneDomainManyRepos = results.find((row) => row.project_name === 'Aurora Code');
assert.equal(oneDomainManyRepos.states.includes('one_domain_many_repos'), true);
assert.equal(oneDomainManyRepos.review_status, 'needs_canonical_review');

const productScope = results.find((row) => row.project_name === 'Aurora Code Platform');
assert.equal(productScope.states.includes('ambiguous_product_scope'), true);

const oneRepoManyDomains = results.find((row) => row.normalized_domain === 'nucleus.example.com');
assert.equal(oneRepoManyDomains.states.includes('one_repo_many_domains'), true);

const exactDuplicate = results.find((row) => row.project_name === 'Pulse Analytics');
assert.equal(exactDuplicate.states.includes('duplicate_confirmed_by_exact_source'), true);

const renamed = results.find((row) => row.project_name === 'Pulse Analytics AI');
assert.equal(renamed.states.includes('renamed_project'), true);
assert.equal(renamed.review_status, 'needs_canonical_review');

const quarantined = results.find((row) => row.project_name === 'Loose Identity');
assert.equal(quarantined.states.includes('quarantined_identity_conflict'), true);
assert.equal(quarantined.review_status, 'needs_canonical_review');

const dryRun = runCanonicalEntityDryRun(rows);
assert.equal(dryRun.result_code, 'AGENT4_CANONICAL_ENTITY_AGENT_READY_DRY_RUN');
assert.equal(dryRun.dry_run, true);
assert.equal(dryRun.network_used, false);
assert.equal(dryRun.production_write, false);
assert.equal(dryRun.auto_publish, false);

console.log('canonical-resolver.test passed');
