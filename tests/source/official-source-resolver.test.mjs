import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  readDiscoveryHintJsonl,
  runOfficialSourceResolverDryRun
} from '../../src/source/official-source-resolver.mjs';

const fixturePath = new URL('../../fixtures/source/sample-discovery-hints.jsonl', import.meta.url);
const hints = readDiscoveryHintJsonl(fixturePath);
const result = runOfficialSourceResolverDryRun(hints);

assert.equal(result.result_code, 'AGENT3_OFFICIAL_SOURCE_RESOLVER_READY_DRY_RUN');
assert.equal(result.dry_run, true);
assert.equal(result.network_used, false);
assert.equal(result.production_write, false);
assert.equal(result.auto_publish, false);
assert.equal(result.summary.total, 3);
assert.equal(result.summary.source_verified, 1);
assert.equal(result.summary.source_missing, 1);
assert.equal(result.summary.source_conflict, 1);

const verified = result.results.find((row) => row.project_name === 'Aurora Code');
assert.equal(verified.source_status, 'source_verified');
assert.equal(verified.official_domain, 'aurora.example');
assert.equal(verified.github_repo, 'example/aurora-code');
assert.equal(verified.docs_domain, 'docs.aurora.example');
assert.equal(verified.auto_publish, false);

const directoryOnly = result.results.find((row) => row.project_name === 'VectorBase');
assert.equal(directoryOnly.source_status, 'source_missing');
assert.equal(directoryOnly.reason_codes.includes('directory_hint_discovery_only'), true);
assert.equal(directoryOnly.manual_review_required, true);

const conflict = result.results.find((row) => row.project_name === 'ComplyKit');
assert.equal(conflict.source_status, 'source_conflict');
assert.equal(conflict.reason_codes.includes('docs_domain_conflict'), true);

JSON.parse(fs.readFileSync(new URL('../../contracts/official-source-result-contract.json', import.meta.url), 'utf8'));

console.log('official-source-resolver.test passed');
