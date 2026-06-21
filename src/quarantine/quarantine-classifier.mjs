import { createHash } from 'node:crypto';

export const AGENT6_RESULT_CODE = 'AGENT6_QUARANTINE_CLASSIFIER_READY';

export const QUARANTINE_CATEGORIES = [
  'missing_official_source',
  'directory_hint_only',
  'canonical_ambiguous',
  'duplicate_conflict',
  'http_unreachable',
  'waf_or_blocked',
  'docs_missing',
  'github_mismatch',
  'copied_content_risk',
  'pii_or_private_data_risk',
  'manual_review_required'
];

export function runQuarantineClassifierDryRun(input = {}) {
  const events = [
    ...classifyDiscovery(input.discovery_results ?? []),
    ...classifySources(input.source_results ?? []),
    ...classifyCanonical(input.canonical_candidates ?? []),
    ...classifyAudit(input.audit_observations ?? [])
  ];

  const uniqueEvents = dedupeEvents(events).sort((left, right) => left.event_id.localeCompare(right.event_id));

  return {
    result_code: AGENT6_RESULT_CODE,
    dry_run: true,
    network_used: false,
    production_write: false,
    auto_publish: false,
    public_projection: false,
    events: uniqueEvents,
    review_blockers: uniqueEvents.map((event) => ({
      event_id: event.event_id,
      project_name: event.project_name,
      category: event.category,
      blocker: event.review_blocker
    })),
    retry_recommendations: uniqueEvents
      .filter((event) => event.retry_recommendation)
      .map((event) => ({
        event_id: event.event_id,
        project_name: event.project_name,
        recommendation: event.retry_recommendation
      })),
    safe_exclusion_reasons: uniqueEvents
      .filter((event) => event.safe_exclusion_reason)
      .map((event) => ({
        event_id: event.event_id,
        project_name: event.project_name,
        reason: event.safe_exclusion_reason
      })),
    summary: summarize(uniqueEvents)
  };
}

function classifyDiscovery(rows) {
  const events = [];
  for (const row of rows) {
    const projectName = row.project_name ?? `discovery-row-${row.row_index ?? 'unknown'}`;
    const reasonCodes = asArray(row.reason_codes);
    if (reasonCodes.includes('directory_hint_only')) {
      events.push(makeEvent('discovery', projectName, row.source_url ?? null, 'directory_hint_only', reasonCodes));
    }
    if (reasonCodes.includes('missing_official_website')) {
      events.push(makeEvent('discovery', projectName, row.source_url ?? null, 'missing_official_source', reasonCodes));
    }
    if (reasonCodes.includes('missing_docs_url')) {
      events.push(makeEvent('discovery', projectName, row.source_url ?? null, 'docs_missing', reasonCodes));
    }
    if (reasonCodes.includes('missing_github_url')) {
      events.push(makeEvent('discovery', projectName, row.source_url ?? null, 'github_mismatch', reasonCodes));
    }
    if (reasonCodes.includes('copied_content_not_used')) {
      events.push(makeEvent('discovery', projectName, row.source_url ?? null, 'copied_content_risk', reasonCodes));
    }
    if (reasonCodes.includes('pii_or_private_data_risk')) {
      events.push(makeEvent('discovery', projectName, row.source_url ?? null, 'pii_or_private_data_risk', reasonCodes));
    }
  }
  return events;
}

function classifySources(rows) {
  const events = [];
  for (const row of rows) {
    const projectName = row.project_name ?? 'source-row-unknown';
    const reasonCodes = asArray(row.reason_codes);
    if (row.source_status === 'source_missing' || reasonCodes.includes('missing_official_website')) {
      events.push(makeEvent('source', projectName, row.official_domain ?? null, 'missing_official_source', reasonCodes));
    }
    if (reasonCodes.includes('directory_hint_discovery_only')) {
      events.push(makeEvent('source', projectName, row.official_domain ?? null, 'directory_hint_only', reasonCodes));
    }
    if (reasonCodes.includes('missing_docs_url')) {
      events.push(makeEvent('source', projectName, row.official_domain ?? null, 'docs_missing', reasonCodes));
    }
    if (reasonCodes.includes('missing_github_repo') || reasonCodes.includes('github_mismatch')) {
      events.push(makeEvent('source', projectName, row.github_repo ?? null, 'github_mismatch', reasonCodes));
    }
    if (row.source_status === 'source_conflict' || row.manual_review_required === true) {
      events.push(makeEvent('source', projectName, row.official_domain ?? null, 'manual_review_required', reasonCodes));
    }
  }
  return events;
}

function classifyCanonical(rows) {
  const events = [];
  for (const row of rows) {
    const projectName = row.project_name ?? row.canonical_slug ?? 'canonical-row-unknown';
    const states = asArray(row.states);
    const ref = row.candidate_id ?? row.canonical_slug ?? null;
    if (states.includes('duplicate_confirmed_by_exact_source') || states.includes('possible_duplicate')) {
      events.push(makeEvent('canonical', projectName, ref, 'duplicate_conflict', states));
    }
    if (
      row.review_status === 'needs_canonical_review' ||
      states.includes('ambiguous_parent_brand') ||
      states.includes('ambiguous_product_scope') ||
      states.includes('one_domain_many_repos') ||
      states.includes('one_repo_many_domains') ||
      states.includes('renamed_project') ||
      states.includes('quarantined_identity_conflict')
    ) {
      events.push(makeEvent('canonical', projectName, ref, 'canonical_ambiguous', states));
    }
  }
  return events;
}

function classifyAudit(rows) {
  const events = [];
  for (const row of rows) {
    const projectName = row.project_name ?? row.target_url ?? 'audit-row-unknown';
    const failures = asArray(row.failures);
    if (failures.some((failure) => ['dns_fail', 'tls_fail', 'timeout', '404_not_found', '5xx_error'].includes(failure))) {
      events.push(makeEvent('audit', projectName, row.target_url ?? null, 'http_unreachable', failures));
    }
    if (failures.includes('blocked_by_waf') || row.waf_or_blocked_status === 'blocked_by_waf') {
      events.push(makeEvent('audit', projectName, row.target_url ?? null, 'waf_or_blocked', failures));
    }
    if (row.docs_linked === false) {
      events.push(makeEvent('audit', projectName, row.target_url ?? null, 'docs_missing', failures));
    }
    if (row.github_linked === false) {
      events.push(makeEvent('audit', projectName, row.target_url ?? null, 'github_mismatch', failures));
    }
  }
  return events;
}

function makeEvent(sourceAgent, projectName, sourceRef, category, reasonCodes) {
  const policy = CATEGORY_POLICY[category] ?? CATEGORY_POLICY.manual_review_required;
  const event = {
    event_id: '',
    project_name: String(projectName),
    source_agent: sourceAgent,
    source_ref: sourceRef,
    category,
    severity: policy.severity,
    reason_codes: unique(reasonCodes.length > 0 ? reasonCodes : [category]),
    review_blocker: policy.review_blocker,
    retry_recommendation: policy.retry_recommendation,
    safe_exclusion_reason: policy.safe_exclusion_reason,
    private_worker_only: true,
    auto_publish: false,
    public_projection: false
  };
  event.event_id = stableEventId(event);
  return event;
}

const CATEGORY_POLICY = {
  missing_official_source: {
    severity: 'high',
    review_blocker: 'Official source is missing or insufficient for admin review.',
    retry_recommendation: 'Re-run after a human provides an official website, GitHub repo, or docs URL.',
    safe_exclusion_reason: null
  },
  directory_hint_only: {
    severity: 'medium',
    review_blocker: 'Directory hints are discovery-only and cannot be used as source authority.',
    retry_recommendation: 'Resolve official source before review packaging.',
    safe_exclusion_reason: 'Exclude from public review payload until official source exists.'
  },
  canonical_ambiguous: {
    severity: 'high',
    review_blocker: 'Canonical identity is ambiguous and needs manual resolution.',
    retry_recommendation: 'Compare official domain, GitHub repo, docs URL, and product scope manually.',
    safe_exclusion_reason: null
  },
  duplicate_conflict: {
    severity: 'medium',
    review_blocker: 'Potential duplicate or exact-source duplicate must be reviewed before packaging.',
    retry_recommendation: 'Resolve duplicate status against canonical index.',
    safe_exclusion_reason: null
  },
  http_unreachable: {
    severity: 'medium',
    review_blocker: 'HTTP audit could not confirm reachable official surface.',
    retry_recommendation: 'Retry a bounded audit later or use a recent successful snapshot for admin review context.',
    safe_exclusion_reason: null
  },
  waf_or_blocked: {
    severity: 'medium',
    review_blocker: 'HTTP audit observed a WAF or blocked response.',
    retry_recommendation: 'Do not bypass; retry later or request manual source confirmation.',
    safe_exclusion_reason: 'Exclude from automated audit conclusions because access was blocked.'
  },
  docs_missing: {
    severity: 'low',
    review_blocker: 'Docs URL or docs link is missing.',
    retry_recommendation: 'Ask reviewer to confirm whether docs exist before publishing.',
    safe_exclusion_reason: null
  },
  github_mismatch: {
    severity: 'low',
    review_blocker: 'GitHub repo is missing or mismatched.',
    retry_recommendation: 'Verify repo ownership manually.',
    safe_exclusion_reason: null
  },
  copied_content_risk: {
    severity: 'high',
    review_blocker: 'Possible copied content was detected and must not be publicized.',
    retry_recommendation: 'Regenerate original summary from official sources only.',
    safe_exclusion_reason: 'Exclude copied input text from all public artifacts.'
  },
  pii_or_private_data_risk: {
    severity: 'high',
    review_blocker: 'Possible private or personal data requires manual review.',
    retry_recommendation: 'Remove private data and retain only public-safe source references.',
    safe_exclusion_reason: 'Exclude private data from worker and public artifacts.'
  },
  manual_review_required: {
    severity: 'medium',
    review_blocker: 'Manual review is required before review-ready packaging.',
    retry_recommendation: 'Route to human review with source and reason codes.',
    safe_exclusion_reason: null
  }
};

function dedupeEvents(events) {
  return [...new Map(events.map((event) => [event.event_id, event])).values()];
}

function summarize(events) {
  const byCategory = Object.fromEntries(QUARANTINE_CATEGORIES.map((category) => [category, 0]));
  for (const event of events) byCategory[event.category] += 1;
  return {
    total: events.length,
    by_category: byCategory,
    high_severity: events.filter((event) => event.severity === 'high').length,
    private_worker_only: true,
    auto_publish: false,
    public_projection: false
  };
}

function stableEventId(event) {
  const input = [event.source_agent, event.project_name, event.source_ref, event.category, event.reason_codes.join(',')].join('|');
  return `q_${createHash('sha256').update(input).digest('hex').slice(0, 16)}`;
}

function asArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.length > 0) : [];
}

function unique(values) {
  return [...new Set(values)];
}
