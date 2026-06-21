import { createHash } from 'node:crypto';
import { DEFAULT_AUDIT_POLICY, validateUrlInput } from './audit-contracts.mjs';

export function runFixtureHttpAudit(inputs, fixtureResponses, previousSnapshots = {}, policy = {}) {
  const effectivePolicy = { ...DEFAULT_AUDIT_POLICY, ...policy };
  const responses = new Map(fixtureResponses.map((response) => [response.url, response]));
  const results = [];
  const cooldownState = new Map();

  for (const input of inputs.slice(0, effectivePolicy.global_concurrency_cap)) {
    const validation = validateUrlInput(input);
    if (!validation.ok) {
      results.push(makeFailure(input.url ?? 'invalid', 'unknown_failure', effectivePolicy, null));
      continue;
    }

    const domain = new URL(input.url).hostname.toLowerCase();
    const now = input.checked_at ?? '2026-06-21T00:00:00.000Z';
    const previousAt = cooldownState.get(domain);
    if (previousAt && effectivePolicy.per_domain_cooldown_ms > 0) {
      results.push(makeFailure(input.url, 'unknown_failure', effectivePolicy, previousSnapshots[input.url], true));
      continue;
    }
    cooldownState.set(domain, now);

    const response = responses.get(input.url);
    if (!response) {
      results.push(makeFailure(input.url, 'unknown_failure', effectivePolicy, previousSnapshots[input.url]));
      continue;
    }
    results.push(evaluateResponse(input.url, response, effectivePolicy, previousSnapshots[input.url]));
  }

  return {
    dry_run: true,
    live_network_used: false,
    browser_fallback_used: false,
    waf_bypass_used: false,
    login_or_cookie_used: false,
    policy: effectivePolicy,
    results
  };
}

function evaluateResponse(url, response, policy, previousSnapshot) {
  const status = response.status ?? 0;
  const body = response.body ?? '';
  const headers = response.headers ?? {};
  const failures = [];

  if (response.dns_status === 'fail') failures.push('dns_fail');
  if (response.tls_status === 'fail') failures.push('tls_fail');
  if (response.timeout === true) failures.push('timeout');
  if (status === 404) failures.push('404_not_found');
  if (status >= 500) failures.push('5xx_error');
  if (response.redirect_loop === true) failures.push('redirect_loop');
  if (response.blocked_by_waf === true) failures.push('blocked_by_waf');
  if (response.robots_unavailable === true) failures.push('robots_unavailable');

  const canonicalDetected = /rel=["']canonical["']/i.test(body);
  const sitemapDetected = Boolean(response.sitemap_detected ?? headers['x-sitemap-detected']);
  const jsonldDetected = /application\/ld\+json/i.test(body);
  const softwareSchemaDetected = /SoftwareApplication/i.test(body);
  const githubLinked = /github\.com\//i.test(body);
  const docsLinked = /docs?\./i.test(body) || /\/docs\b/i.test(body);

  if (!sitemapDetected) failures.push('sitemap_missing');
  if (!jsonldDetected) failures.push('jsonld_missing');
  if (!canonicalDetected) failures.push('canonical_missing');

  const observation = {
    target_url: url,
    website_reachable: status >= 200 && status < 400 && !failures.includes('dns_fail') && !failures.includes('tls_fail'),
    canonical_detected: canonicalDetected,
    sitemap_detected: sitemapDetected,
    jsonld_detected: jsonldDetected,
    software_application_schema_detected: softwareSchemaDetected,
    github_linked: githubLinked,
    docs_linked: docsLinked,
    redirect_status: response.redirect_status ?? 'none',
    dns_status: response.dns_status ?? 'ok',
    tls_status: response.tls_status ?? 'ok',
    waf_or_blocked_status: response.blocked_by_waf ? 'blocked_by_waf' : 'not_blocked',
    checked_at: response.checked_at ?? '2026-06-21T00:00:00.000Z',
    audit_method: policy.audit_method,
    failures,
    stale: failures.length > 0 && Boolean(previousSnapshot),
    last_successful_snapshot: failures.length > 0 ? previousSnapshot ?? null : makeSnapshot(url, response)
  };
  observation.audit_observation_hash = hashObservation(observation);
  return observation;
}

function makeFailure(url, reason, policy, previousSnapshot, cooldown = false) {
  const observation = {
    target_url: url,
    website_reachable: false,
    canonical_detected: false,
    sitemap_detected: false,
    jsonld_detected: false,
    software_application_schema_detected: false,
    github_linked: false,
    docs_linked: false,
    redirect_status: 'unknown',
    dns_status: 'unknown',
    tls_status: 'unknown',
    waf_or_blocked_status: 'unknown',
    checked_at: '2026-06-21T00:00:00.000Z',
    audit_method: policy.audit_method,
    failures: cooldown ? ['unknown_failure'] : [reason],
    stale: Boolean(previousSnapshot),
    last_successful_snapshot: previousSnapshot ?? null
  };
  observation.audit_observation_hash = hashObservation(observation);
  return observation;
}

function makeSnapshot(url, response) {
  return {
    target_url: url,
    status: response.status,
    checked_at: response.checked_at ?? '2026-06-21T00:00:00.000Z'
  };
}

function hashObservation(observation) {
  const clone = { ...observation };
  delete clone.audit_observation_hash;
  return createHash('sha256').update(JSON.stringify(clone, Object.keys(clone).sort())).digest('hex');
}
