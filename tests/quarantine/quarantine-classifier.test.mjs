import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  AGENT6_RESULT_CODE,
  QUARANTINE_CATEGORIES,
  runQuarantineClassifierDryRun
} from '../../src/quarantine/quarantine-classifier.mjs';

const fixturePath = new URL('../../fixtures/quarantine/sample-agent6-input.json', import.meta.url);
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const result = runQuarantineClassifierDryRun(fixture);

assert.equal(result.result_code, AGENT6_RESULT_CODE);
assert.equal(result.dry_run, true);
assert.equal(result.network_used, false);
assert.equal(result.production_write, false);
assert.equal(result.auto_publish, false);
assert.equal(result.public_projection, false);
assert.equal(result.events.length > 0, true);
assert.equal(result.events.every((event) => event.private_worker_only === true), true);
assert.equal(result.events.every((event) => event.auto_publish === false), true);
assert.equal(result.events.every((event) => event.public_projection === false), true);
assert.equal(result.events.every((event) => QUARANTINE_CATEGORIES.includes(event.category)), true);
assert.equal(result.review_blockers.length, result.events.length);
assert.equal(result.retry_recommendations.length > 0, true);
assert.equal(result.safe_exclusion_reasons.length > 0, true);

const categories = new Set(result.events.map((event) => event.category));
assert.equal(categories.has('missing_official_source'), true);
assert.equal(categories.has('directory_hint_only'), true);
assert.equal(categories.has('copied_content_risk'), true);
assert.equal(categories.has('canonical_ambiguous'), true);
assert.equal(categories.has('duplicate_conflict'), true);
assert.equal(categories.has('waf_or_blocked'), true);
assert.equal(categories.has('http_unreachable'), true);
assert.equal(categories.has('docs_missing'), true);
assert.equal(categories.has('github_mismatch'), true);
assert.equal(categories.has('manual_review_required'), true);

const copiedContent = result.events.find((event) => event.category === 'copied_content_risk');
assert.match(copiedContent.review_blocker, /must not be publicized/i);

const waf = result.events.find((event) => event.category === 'waf_or_blocked');
assert.match(waf.retry_recommendation, /Do not bypass/i);

console.log('quarantine-classifier.test passed');
