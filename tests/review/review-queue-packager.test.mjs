import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AGENT7_RESULT_CODE, runReviewQueuePackagerDryRun } from '../../src/review/review-queue-packager.mjs';

const fixturePath = new URL('../../fixtures/review/sample-agent7-input.json', import.meta.url);
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const result = runReviewQueuePackagerDryRun(fixture);

assert.equal(result.result_code, AGENT7_RESULT_CODE);
assert.equal(result.dry_run, true);
assert.equal(result.network_used, false);
assert.equal(result.production_write, false);
assert.equal(result.auto_publish, false);
assert.equal(result.public_projection, false);
assert.equal(result.review_ready.length, 1);
assert.equal(result.review_blocked.length, 1);
assert.equal(result.files['review-ready.jsonl'].includes('Aurora Code'), true);
assert.equal(result.files['review-blocked.jsonl'].includes('Blocked Audit AI'), true);
assert.match(result.files['admin-summary.md'], /admin review only/i);
assert.equal(result.import_manifest.admin_review_only, true);
assert.equal(result.import_manifest.auto_publish, false);
assert.equal(result.import_manifest.public_projection, false);

const ready = result.review_ready[0];
assert.deepEqual(Object.keys(ready), [
  'project_name',
  'slug_candidate',
  'official_website_url',
  'github_url',
  'docs_url',
  'primary_category',
  'collection_tag_candidates',
  'public_signal_chip_candidates',
  'original_summary_candidate',
  'review_blockers',
  'source_status',
  'canonical_status',
  'audit_status',
  'recommendation'
]);
assert.equal(ready.project_name, 'Aurora Code');
assert.equal(ready.slug_candidate, 'aurora-code');
assert.equal(ready.source_status, 'source_verified');
assert.equal(ready.canonical_status, 'ready_for_review');
assert.equal(ready.audit_status, 'audit_passed');
assert.equal(ready.recommendation, 'recommend_review');
assert.equal(ready.review_blockers.length, 0);
assert.equal(ready.public_signal_chip_candidates.includes('github_linked'), true);

const blocked = result.review_blocked[0];
assert.equal(blocked.recommendation, 'recommend_quarantine');
assert.equal(blocked.review_blockers.includes('source_not_verified'), true);
assert.equal(blocked.review_blockers.includes('canonical_review_needed'), true);
assert.equal(blocked.review_blockers.includes('audit_attention_needed'), true);
assert.equal(blocked.review_blockers.includes('quarantine:waf_or_blocked'), true);

console.log('review-queue-packager.test passed');
