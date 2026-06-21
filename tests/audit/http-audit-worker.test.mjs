import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEFAULT_AUDIT_POLICY, FAILURE_TAXONOMY, validateUrlInput } from '../../src/audit/audit-contracts.mjs';
import { runFixtureHttpAudit, runHttpAuditAgentDryRun } from '../../src/audit/audit-worker.mjs';

const fixturePath = new URL('../../fixtures/audit/sample-http-fixtures.json', import.meta.url);
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

assert.equal(DEFAULT_AUDIT_POLICY.live_network_default, false);
assert.equal(DEFAULT_AUDIT_POLICY.browser_fallback_allowed, false);
assert.equal(DEFAULT_AUDIT_POLICY.waf_bypass_allowed, false);
assert.equal(DEFAULT_AUDIT_POLICY.login_or_cookie_allowed, false);
assert.equal(DEFAULT_AUDIT_POLICY.global_concurrency_cap <= 3, true);
assert.equal(FAILURE_TAXONOMY.includes('blocked_by_waf'), true);
assert.equal(validateUrlInput({ url: 'ftp://example.com' }).ok, false);

const agentRun = runHttpAuditAgentDryRun(fixture.inputs, fixture.responses, fixture.previous_snapshots);
assert.equal(agentRun.result_code, 'AGENT5_HTTP_AUDIT_AGENT_READY_FIXTURE_DEFAULT');
assert.equal(agentRun.dry_run, true);
assert.equal(agentRun.network_used, false);
assert.equal(agentRun.production_write, false);
assert.equal(agentRun.auto_publish, false);
assert.equal(agentRun.audit.live_network_used, false);
assert.equal(agentRun.audit.browser_fallback_used, false);
assert.equal(agentRun.audit.waf_bypass_used, false);

const run = runFixtureHttpAudit(fixture.inputs, fixture.responses, fixture.previous_snapshots);
assert.equal(run.dry_run, true);
assert.equal(run.live_network_used, false);
assert.equal(run.browser_fallback_used, false);
assert.equal(run.waf_bypass_used, false);
assert.equal(run.login_or_cookie_used, false);
assert.equal(run.results.length, 3);

const ok = run.results.find((result) => result.target_url === 'https://aurora.example.com');
assert.equal(ok.website_reachable, true);
assert.equal(ok.canonical_detected, true);
assert.equal(ok.sitemap_detected, true);
assert.equal(ok.jsonld_detected, true);
assert.equal(ok.software_application_schema_detected, true);
assert.equal(ok.github_linked, true);
assert.equal(ok.docs_linked, true);

const blocked = run.results.find((result) => result.target_url === 'https://blocked.example.com');
assert.equal(blocked.failures.includes('blocked_by_waf'), true);
assert.equal(blocked.stale, true);
assert.equal(blocked.last_successful_snapshot.status, 200);

const missingSchema = run.results.find((result) => result.target_url === 'https://missing-schema.example.com');
assert.equal(missingSchema.failures.includes('sitemap_missing'), true);
assert.equal(missingSchema.failures.includes('jsonld_missing'), true);
assert.equal(missingSchema.software_application_schema_detected, false);

console.log('http-audit-worker.test passed');
