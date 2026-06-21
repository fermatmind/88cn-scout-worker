import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readSeedHintJsonl, runDiscoveryHintDryRun } from '../../src/discovery/discovery-hint-agent.mjs';

const fixturePath = new URL('../../fixtures/discovery/sample-seed-hints.jsonl', import.meta.url);
const hints = readSeedHintJsonl(fixturePath);
const result = runDiscoveryHintDryRun(hints);

assert.equal(result.result_code, 'AGENT2_DISCOVERY_HINT_AGENT_READY_DRY_RUN');
assert.equal(result.dry_run, true);
assert.equal(result.network_used, false);
assert.equal(result.production_write, false);
assert.equal(result.auto_publish, false);
assert.equal(result.summary.total, 3);
assert.equal(result.summary.normalized, 1);
assert.equal(result.summary.weak_hints, 1);
assert.equal(result.summary.rejected, 1);

const accepted = result.normalized[0];
assert.equal(accepted.project_name, 'Aurora Code');
assert.equal(accepted.auto_publish, false);
assert.equal(accepted.reason_codes.includes('copied_content_not_used'), true);
assert.equal(accepted.reason_codes.includes('ranking_not_imported'), true);
assert.equal('description' in accepted, false);
assert.equal('ranking' in accepted, false);

const weak = result.weak_hints[0];
assert.equal(weak.project_name, 'VectorBase');
assert.equal(weak.reason_codes.includes('directory_hint_only'), true);
assert.equal(weak.auto_publish, false);

assert.deepEqual(result.rejected[0].reason_codes, [
  'missing_project_name',
  'invalid_source_url',
  'invalid_source_type'
]);

JSON.parse(fs.readFileSync(new URL('../../contracts/discovery-hint-contract.json', import.meta.url), 'utf8'));

console.log('discovery-hint-agent.test passed');
