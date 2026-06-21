import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runAgentCli } from '../../src/cli/agent-runner.mjs';

const outputDir = 'tmp/agent1-test-output';
fs.rmSync(outputDir, { recursive: true, force: true });

const exitCode = runAgentCli([
  '--agent',
  'AGENT1',
  '--manifest',
  'fixtures/agent1/sample-agent-run-manifest.json',
  '--out',
  outputDir,
  '--dry-run',
  '--no-network'
]);

assert.equal(exitCode, 0);
for (const file of [
  'manifest.json',
  'result.json',
  'events.jsonl',
  'quarantine.jsonl',
  'review-ready.jsonl',
  'report.md'
]) {
  assert.equal(fs.existsSync(path.join(outputDir, file)), true, `${file} missing`);
}

const result = JSON.parse(fs.readFileSync(path.join(outputDir, 'result.json'), 'utf8'));
assert.equal(result.result_code, 'AGENT1_CLI_CONTRACT_READY_NO_RUNTIME');
assert.equal(result.dry_run, true);
assert.equal(result.network_used, false);
assert.equal(result.writes.db, 0);
assert.equal(result.writes.published_projection, 0);
assert.equal(result.writes.sitemap, 0);
assert.equal(result.writes.external, 0);

const missingDryRun = runAgentCli([
  '--agent',
  'AGENT1',
  '--manifest',
  'fixtures/agent1/sample-agent-run-manifest.json',
  '--out',
  outputDir,
  '--no-network'
]);
assert.equal(missingDryRun, 2);

const outsideRepo = runAgentCli([
  '--agent',
  'AGENT1',
  '--manifest',
  'fixtures/agent1/sample-agent-run-manifest.json',
  '--out',
  '../agent1-outside',
  '--dry-run',
  '--no-network'
]);
assert.equal(outsideRepo, 1);

fs.rmSync(outputDir, { recursive: true, force: true });

console.log('agent-runner.test passed');
