import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEFAULT_QUEUE_POLICY, validateQueuePolicy } from '../../src/queue/queue-policy.mjs';
import { FUTURE_REDIS_ADAPTER_CONTRACT } from '../../src/queue/redis-adapter-contract.mjs';
import { LocalDryRunQueue } from '../../src/queue/local-queue-adapter.mjs';

assert.equal(DEFAULT_QUEUE_POLICY.max_attempts <= 3, true);
assert.equal(DEFAULT_QUEUE_POLICY.default_concurrency <= 3, true);
assert.equal(DEFAULT_QUEUE_POLICY.dead_letter_required, true);
assert.equal(DEFAULT_QUEUE_POLICY.redis_connection_allowed, false);
assert.equal(FUTURE_REDIS_ADAPTER_CONTRACT.runtime_connection_allowed, false);
assert.equal(FUTURE_REDIS_ADAPTER_CONTRACT.fermatmind_redis_allowed, false);
assert.equal(FUTURE_REDIS_ADAPTER_CONTRACT.tencent_redis_allowed, false);
assert.equal(validateQueuePolicy({ ...DEFAULT_QUEUE_POLICY, max_attempts: 4 }).ok, false);

const fixturePath = new URL('../../fixtures/queue/sample-jobs.json', import.meta.url);
const jobs = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const queue = new LocalDryRunQueue();
for (const job of jobs) queue.enqueue(job);

const run = queue.run((job) => {
  if (job.job_id === 'canonical-fail') return { ok: false, reason: 'needs_canonical_review' };
  return { ok: true, output: { accepted: true } };
});

assert.equal(run.dry_run, true);
assert.equal(run.redis_connected, false);
assert.equal(run.runtime_daemon_started, false);
assert.equal(run.dead_letters.length, 1);
assert.equal(run.dead_letters[0].job_id, 'canonical-fail');
assert.equal(run.dead_letters[0].attempts, 3);
assert.equal(run.dead_letters[0].redis_connected, false);
assert.equal(run.quarantine.length, 1);
assert.equal(run.results.some((result) => result.status === 'retry_scheduled'), true);
assert.equal(run.results.some((result) => result.status === 'dead_lettered'), true);

assert.throws(
  () => new LocalDryRunQueue().enqueue({ job_id: 'audit-missing-cooldown', kind: 'audit', payload: {} }),
  /audit_job_requires_per_domain_cooldown/
);

console.log('local-queue-adapter.test passed');
