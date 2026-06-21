import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  AGENT8_RESULT_CODE,
  RECOMMENDATION_VALUES,
  runPublishRecommendationDryRun
} from '../../src/recommendation/publish-recommendation-engine.mjs';

const fixturePath = new URL('../../fixtures/recommendation/sample-agent8-review-payloads.json', import.meta.url);
const payloads = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const result = runPublishRecommendationDryRun(payloads);

assert.equal(result.result_code, AGENT8_RESULT_CODE);
assert.equal(result.dry_run, true);
assert.equal(result.network_used, false);
assert.equal(result.production_write, false);
assert.equal(result.auto_publish, false);
assert.equal(result.published, false);
assert.equal(result.public_projection, false);
assert.equal(result.recommendations.length, payloads.length);
assert.equal(result.recommendations.every((row) => RECOMMENDATION_VALUES.includes(row.recommendation)), true);
assert.equal(result.recommendations.every((row) => row.no_public_claim === true), true);
assert.equal(result.recommendations.every((row) => row.published === false), true);
assert.equal(result.recommendations.every((row) => row.auto_publish === false), true);
assert.equal(result.recommendations.every((row) => row.public_projection === false), true);
assert.equal(result.summary.recommend_publish_is_not_published, true);

const publish = result.recommendations.find((row) => row.project_name === 'Aurora Code');
assert.equal(publish.recommendation, 'recommend_publish');
assert.equal(publish.published, false);
assert.match(publish.human_review_notes.join(' '), /does not create published state/i);

const quarantine = result.recommendations.find((row) => row.project_name === 'Blocked Audit AI');
assert.equal(quarantine.recommendation, 'recommend_quarantine');
assert.equal(quarantine.risk_flags.includes('quarantine:waf_or_blocked'), true);

const copied = result.recommendations.find((row) => row.project_name === 'Copied Summary AI');
assert.equal(copied.recommendation, 'recommend_reject');
assert.equal(copied.risk_flags.includes('copied_content_risk'), true);

const missing = result.recommendations.find((row) => row.project_name === 'Missing Fields AI');
assert.equal(missing.recommendation, 'recommend_review');
assert.deepEqual(missing.missing_fields, ['slug_candidate', 'official_website_url']);

const recheck = result.recommendations.find((row) => row.project_name === 'Recheck AI');
assert.equal(recheck.recommendation, 'recommend_recheck');

console.log('publish-recommendation-engine.test passed');
