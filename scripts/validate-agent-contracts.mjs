import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateAgentManifest } from '../src/contracts/agent-contracts.mjs';

const root = new URL('..', import.meta.url).pathname;
const requiredContracts = [
  'contracts/agent-run-manifest.schema.json',
  'contracts/agent-run-result.schema.json',
  'contracts/review-ready-payload.schema.json'
];

for (const contract of requiredContracts) {
  JSON.parse(fs.readFileSync(path.join(root, contract), 'utf8'));
}

const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/agent1/sample-agent-run-manifest.json'), 'utf8'));
const validation = validateAgentManifest(fixture);
assert.equal(validation.ok, true);
assert.equal(validation.manifest.network, 'disabled');
assert.equal(validation.manifest.write_policy, 'local_artifacts_only');

for (const denied of [
  { ...fixture, network: 'enabled' },
  { ...fixture, write_policy: 'repo_write' },
  { ...fixture, agent: 'AGENT-INTEGRATION0' }
]) {
  assert.equal(validateAgentManifest(denied).ok, false);
}

console.log('validate-agent-contracts passed');
