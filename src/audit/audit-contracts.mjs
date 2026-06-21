export const FAILURE_TAXONOMY = [
  'dns_fail',
  'tls_fail',
  'timeout',
  '404_not_found',
  '5xx_error',
  'redirect_loop',
  'blocked_by_waf',
  'robots_unavailable',
  'sitemap_missing',
  'jsonld_missing',
  'canonical_missing',
  'unknown_failure'
];

export const DEFAULT_AUDIT_POLICY = {
  global_concurrency_cap: 3,
  per_domain_cooldown_ms: 1000,
  timeout_ms: 8000,
  max_retries: 2,
  backoff_ms: 250,
  audit_method: 'fixture_http_first',
  live_network_default: false,
  browser_fallback_allowed: false,
  waf_bypass_allowed: false,
  login_or_cookie_allowed: false
};

export function validateUrlInput(input) {
  if (!input || typeof input !== 'object') return { ok: false, errors: ['input_not_object'] };
  const errors = [];
  if (typeof input.url !== 'string') errors.push('missing_url');
  else {
    try {
      const url = new URL(input.url);
      if (!['http:', 'https:'].includes(url.protocol)) errors.push('unsupported_protocol');
    } catch {
      errors.push('invalid_url');
    }
  }
  if (input.domain_cooldown_ms !== undefined && input.domain_cooldown_ms < 0) {
    errors.push('invalid_domain_cooldown');
  }
  return { ok: errors.length === 0, errors };
}
