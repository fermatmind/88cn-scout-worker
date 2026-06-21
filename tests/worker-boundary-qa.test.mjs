import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_AUDIT_POLICY } from '../src/audit/audit-contracts.mjs';
import { DEFAULT_QUEUE_POLICY } from '../src/queue/queue-policy.mjs';
import { FUTURE_REDIS_ADAPTER_CONTRACT } from '../src/queue/redis-adapter-contract.mjs';

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

console.log('worker-boundary-qa.test passed');

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return [fullPath];
  });
}
