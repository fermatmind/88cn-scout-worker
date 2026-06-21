import fs from 'node:fs';
import path from 'node:path';

export const AGENT_RUNNER_RESULT_CODE = 'AGENT1_CLI_CONTRACT_READY_NO_RUNTIME';

const AGENT_IDS = new Set([
  'AGENT1',
  'AGENT2',
  'AGENT3',
  'AGENT4',
  'AGENT5',
  'AGENT6',
  'AGENT7',
  'AGENT8',
  'AGENT9',
  'AGENTQ'
]);

export function readAgentManifest(filePath) {
  return parseAgentManifest(fs.readFileSync(filePath, 'utf8'));
}

export function parseAgentManifest(text) {
  return validateAgentManifest(JSON.parse(text));
}

export function validateAgentManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return rejectManifest(manifest, ['manifest_not_object']);
  }
  if (!isRunId(manifest.run_id)) errors.push('invalid_run_id');
  if (!AGENT_IDS.has(manifest.agent)) errors.push('invalid_agent');
  if (!['contract_smoke', 'fixture_dry_run'].includes(manifest.mode)) errors.push('invalid_mode');
  if (manifest.network !== 'disabled') errors.push('network_must_be_disabled');
  if (manifest.write_policy !== 'local_artifacts_only') errors.push('write_policy_must_be_local_artifacts_only');
  if (!manifest.input || typeof manifest.input !== 'object' || Array.isArray(manifest.input)) {
    errors.push('input_not_object');
  } else if (typeof manifest.input.fixture_set !== 'string' || manifest.input.fixture_set.trim() === '') {
    errors.push('missing_fixture_set');
  }
  if (errors.length > 0) return rejectManifest(manifest, errors);
  return {
    ok: true,
    manifest: {
      run_id: manifest.run_id,
      agent: manifest.agent,
      mode: manifest.mode,
      network: manifest.network,
      write_policy: manifest.write_policy,
      input: {
        fixture_set: manifest.input.fixture_set,
        notes: manifest.input.notes ?? null
      }
    },
    errors: []
  };
}

export function buildAgentRunResult({ manifest, artifactNames, status = 'completed' }) {
  return {
    schema_version: 'agent-run-result.v1',
    run_id: manifest.run_id,
    agent: manifest.agent,
    status,
    dry_run: true,
    network_used: false,
    writes: {
      local_artifacts: artifactNames.length,
      db: 0,
      published_projection: 0,
      sitemap: 0,
      external: 0
    },
    artifacts: artifactNames,
    result_code: AGENT_RUNNER_RESULT_CODE
  };
}

export function assertSafeOutputDir(outputDir) {
  if (typeof outputDir !== 'string' || outputDir.trim() === '') {
    throw new Error('missing output directory');
  }
  const resolved = path.resolve(outputDir);
  const cwd = process.cwd();
  const relative = path.relative(cwd, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('output directory must be inside worker repo');
  }
  if (!relative.startsWith('tmp/') && !relative.startsWith('fixtures/agent1/output/')) {
    throw new Error('output directory must be under tmp/ or fixtures/agent1/output/');
  }
  return resolved;
}

function rejectManifest(manifest, errors) {
  return {
    ok: false,
    manifest,
    errors
  };
}

function isRunId(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{2,80}$/.test(value);
}
