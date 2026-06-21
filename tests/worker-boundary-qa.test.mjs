import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_AUDIT_POLICY } from '../src/audit/audit-contracts.mjs';
import { runHttpAuditAgentDryRun } from '../src/audit/audit-worker.mjs';
import { runCanonicalEntityDryRun } from '../src/canonical/canonical-resolver.mjs';
import { validateAgentManifest } from '../src/contracts/agent-contracts.mjs';
import { readSeedHintJsonl, runDiscoveryHintDryRun } from '../src/discovery/discovery-hint-agent.mjs';
import { runQuarantineClassifierDryRun } from '../src/quarantine/quarantine-classifier.mjs';
import { DEFAULT_QUEUE_POLICY } from '../src/queue/queue-policy.mjs';
import { FUTURE_REDIS_ADAPTER_CONTRACT } from '../src/queue/redis-adapter-contract.mjs';
import { runPublishRecommendationDryRun } from '../src/recommendation/publish-recommendation-engine.mjs';
import { runReviewQueuePackagerDryRun } from '../src/review/review-queue-packager.mjs';
import { readDiscoveryHintJsonl, runOfficialSourceResolverDryRun } from '../src/source/official-source-resolver.mjs';

const AGENTQ_RESULT_CODE = 'PASS_AGENTQ_NO_AUTO_PUBLISH_QA';

const root = new URL('..', import.meta.url).pathname;
const forbiddenFiles = ['package.json', 'package-lock.json'];
for (const file of forbiddenFiles) {
  assert.equal(fs.existsSync(path.join(root, file)), false, `${file} must remain absent`);
}
assert.equal(fs.existsSync(path.join(root, 'node_modules')), false, 'node_modules must remain absent');

const files = listFiles(root).filter((file) => !file.includes('/.git/'));
const scannedRoots = ['/src/', '/contracts/', '/fixtures/'];
const sourceFiles = files.filter(
  (file) => /\.(mjs|js|json|jsonl)$/.test(file) && scannedRoots.some((segment) => file.includes(segment))
);
const joined = sourceFiles.map((file) => `${file}\n${fs.readFileSync(file, 'utf8')}`).join('\n');

const deniedRuntimePatterns = [
  /fetch\s*\(/,
  /http\.request\s*\(/,
  /https\.request\s*\(/,
  /createClient\s*\(/,
  /process\.env/,
  /playwright/i,
  /puppeteer/i,
  /pm2/i,
  /nginx/i,
  /setInterval\s*\(/,
  /listen\s*\(/
];

for (const pattern of deniedRuntimePatterns) {
  assert.equal(pattern.test(joined), false, `forbidden runtime pattern: ${pattern}`);
}

assert.equal(DEFAULT_AUDIT_POLICY.live_network_default, false);
assert.equal(DEFAULT_AUDIT_POLICY.browser_fallback_allowed, false);
assert.equal(DEFAULT_AUDIT_POLICY.waf_bypass_allowed, false);
assert.equal(DEFAULT_AUDIT_POLICY.login_or_cookie_allowed, false);
assert.equal(DEFAULT_QUEUE_POLICY.redis_connection_allowed, false);
assert.equal(DEFAULT_QUEUE_POLICY.max_attempts <= 3, true);
assert.equal(DEFAULT_QUEUE_POLICY.default_concurrency <= 3, true);
assert.equal(FUTURE_REDIS_ADAPTER_CONTRACT.runtime_connection_allowed, false);
assert.equal(FUTURE_REDIS_ADAPTER_CONTRACT.shared_redis_allowed, false);
assert.equal(FUTURE_REDIS_ADAPTER_CONTRACT.fermatmind_redis_allowed, false);
assert.equal(FUTURE_REDIS_ADAPTER_CONTRACT.tencent_redis_allowed, false);

for (const file of fs.readdirSync(path.join(root, 'contracts'))) {
  JSON.parse(fs.readFileSync(path.join(root, 'contracts', file), 'utf8'));
}

const agent1Manifest = validateAgentManifest(readJson('fixtures/agent1/sample-agent-run-manifest.json'));
assert.equal(agent1Manifest.ok, true);
assert.equal(agent1Manifest.manifest.network, 'disabled');
assert.equal(agent1Manifest.manifest.write_policy, 'local_artifacts_only');

const agent2 = runDiscoveryHintDryRun(readSeedHintJsonl(path.join(root, 'fixtures/discovery/sample-seed-hints.jsonl')));
assert.equal(agent2.result_code, 'AGENT2_DISCOVERY_HINT_AGENT_READY_DRY_RUN');
assertNoPublicWrite(agent2, 'AGENT2');

const agent3 = runOfficialSourceResolverDryRun(readDiscoveryHintJsonl(path.join(root, 'fixtures/source/sample-discovery-hints.jsonl')));
assert.equal(agent3.result_code, 'AGENT3_OFFICIAL_SOURCE_RESOLVER_READY_DRY_RUN');
assertNoPublicWrite(agent3, 'AGENT3');

const agent4 = runCanonicalEntityDryRun(readJson('fixtures/canonical/sample-candidates.json'));
assert.equal(agent4.result_code, 'AGENT4_CANONICAL_ENTITY_AGENT_READY_DRY_RUN');
assertNoPublicWrite(agent4, 'AGENT4');

const auditFixture = readJson('fixtures/audit/sample-http-fixtures.json');
const agent5 = runHttpAuditAgentDryRun(auditFixture.inputs, auditFixture.responses, auditFixture.previous_snapshots);
assert.equal(agent5.result_code, 'AGENT5_HTTP_AUDIT_AGENT_READY_FIXTURE_DEFAULT');
assertNoPublicWrite(agent5, 'AGENT5');
assert.equal(agent5.audit.live_network_used, false);
assert.equal(agent5.audit.browser_fallback_used, false);
assert.equal(agent5.audit.waf_bypass_used, false);

const agent6 = runQuarantineClassifierDryRun(readJson('fixtures/quarantine/sample-agent6-input.json'));
assert.equal(agent6.result_code, 'AGENT6_QUARANTINE_CLASSIFIER_READY');
assertNoPublicWrite(agent6, 'AGENT6');
assert.equal(agent6.events.every((event) => event.private_worker_only === true), true);

const agent7 = runReviewQueuePackagerDryRun(readJson('fixtures/review/sample-agent7-input.json'));
assert.equal(agent7.result_code, 'AGENT7_REVIEW_QUEUE_PACKAGER_READY');
assertNoPublicWrite(agent7, 'AGENT7');
assert.equal(agent7.import_manifest.admin_review_only, true);

const agent8 = runPublishRecommendationDryRun(readJson('fixtures/recommendation/sample-agent8-review-payloads.json'));
assert.equal(agent8.result_code, 'AGENT8_PUBLISH_RECOMMENDATION_READY_NO_AUTOPUBLISH');
assertNoPublicWrite(agent8, 'AGENT8');
assert.equal(agent8.summary.recommend_publish_is_not_published, true);

assert.equal(AGENTQ_RESULT_CODE, 'PASS_AGENTQ_NO_AUTO_PUBLISH_QA');

console.log(`${AGENTQ_RESULT_CODE}: worker-boundary-qa.test passed`);

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return [fullPath];
  });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function assertNoPublicWrite(value, label, seen = new Set()) {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if ('network_used' in value) assert.equal(value.network_used, false, `${label} network_used`);
  if ('production_write' in value) assert.equal(value.production_write, false, `${label} production_write`);
  if ('auto_publish' in value) assert.equal(value.auto_publish, false, `${label} auto_publish`);
  if ('published' in value) assert.equal(value.published, false, `${label} published`);
  if ('public_projection' in value) assert.equal(value.public_projection, false, `${label} public_projection`);
  if ('private_worker_only' in value) assert.equal(value.private_worker_only, true, `${label} private_worker_only`);
  if ('writes' in value && value.writes && typeof value.writes === 'object') {
    assert.equal(value.writes.db ?? 0, 0, `${label} writes.db`);
    assert.equal(value.writes.published_projection ?? 0, 0, `${label} writes.published_projection`);
    assert.equal(value.writes.sitemap ?? 0, 0, `${label} writes.sitemap`);
    assert.equal(value.writes.external ?? 0, 0, `${label} writes.external`);
  }

  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) assertNoPublicWrite(item, label, seen);
    } else {
      assertNoPublicWrite(child, label, seen);
    }
  }
}
