import { normalizeProjectName } from '../canonical/normalizers.mjs';

export const AGENT7_RESULT_CODE = 'AGENT7_REVIEW_QUEUE_PACKAGER_READY';

export function runReviewQueuePackagerDryRun(input = {}) {
  const sources = indexByProject(input.source_records ?? []);
  const audits = indexByProject(input.audit_observations ?? []);
  const quarantine = groupByProject(input.quarantine_events ?? []);
  const rows = input.canonical_candidates ?? [];

  const packaged = rows.map((candidate, index) => {
    const projectName = candidate.project_name ?? `review-row-${index}`;
    const key = projectKey(projectName);
    return packageCandidate({
      candidate,
      source: sources.get(key),
      audit: audits.get(key),
      quarantineEvents: quarantine.get(key) ?? []
    });
  });

  const reviewReady = packaged.filter((row) => row.review_blockers.length === 0);
  const reviewBlocked = packaged.filter((row) => row.review_blockers.length > 0);

  return {
    result_code: AGENT7_RESULT_CODE,
    dry_run: true,
    network_used: false,
    production_write: false,
    auto_publish: false,
    public_projection: false,
    files: {
      'review-ready.jsonl': toJsonl(reviewReady),
      'review-blocked.jsonl': toJsonl(reviewBlocked),
      'admin-summary.md': makeAdminSummary(reviewReady, reviewBlocked),
      'import-manifest.json': JSON.stringify(makeImportManifest(reviewReady, reviewBlocked), null, 2)
    },
    review_ready: reviewReady,
    review_blocked: reviewBlocked,
    import_manifest: makeImportManifest(reviewReady, reviewBlocked),
    summary: {
      total: packaged.length,
      review_ready: reviewReady.length,
      review_blocked: reviewBlocked.length,
      admin_review_only: true,
      auto_publish: false,
      public_projection: false
    }
  };
}

function packageCandidate({ candidate, source, audit, quarantineEvents }) {
  const projectName = candidate.project_name ?? candidate.canonical_slug ?? 'unknown-project';
  const sourceStatus = source?.source_status ?? 'source_missing';
  const canonicalStatus = candidate.review_status ?? 'needs_canonical_review';
  const auditStatus = classifyAudit(audit);
  const reviewBlockers = collectBlockers({ source, candidate, audit, quarantineEvents });

  return {
    project_name: projectName,
    slug_candidate: candidate.canonical_slug ?? slugify(projectName),
    official_website_url: source?.official_website_url ?? domainToUrl(source?.official_domain) ?? '',
    github_url: source?.github_url ?? repoToUrl(source?.github_repo),
    docs_url: source?.docs_url ?? domainToUrl(source?.docs_domain),
    primary_category: source?.primary_category ?? source?.suggested_category ?? null,
    collection_tag_candidates: collectionTags(source),
    public_signal_chip_candidates: signalChips(audit),
    original_summary_candidate: source?.original_summary_candidate ?? null,
    review_blockers: reviewBlockers,
    source_status: sourceStatus,
    canonical_status: canonicalStatus,
    audit_status: auditStatus,
    recommendation: reviewBlockers.length > 0 ? 'recommend_quarantine' : 'recommend_review'
  };
}

function collectBlockers({ source, candidate, audit, quarantineEvents }) {
  const blockers = [];
  if (!source || source.source_status !== 'source_verified') {
    blockers.push('source_not_verified');
  }
  if (!candidate || candidate.review_status !== 'ready_for_review') {
    blockers.push('canonical_review_needed');
  }
  if (!audit || classifyAudit(audit) !== 'audit_passed') {
    blockers.push('audit_attention_needed');
  }
  for (const event of quarantineEvents) {
    blockers.push(`quarantine:${event.category}`);
  }
  return unique(blockers);
}

function classifyAudit(audit) {
  if (!audit) return 'audit_missing';
  if (audit.website_reachable === true && asArray(audit.failures).length === 0) return 'audit_passed';
  if (audit.website_reachable === true) return 'audit_warning';
  return 'audit_attention_needed';
}

function signalChips(audit) {
  if (!audit) return [];
  const chips = [];
  if (audit.website_reachable === true) chips.push('official_site_reachable');
  if (audit.github_linked === true) chips.push('github_linked');
  if (audit.docs_linked === true) chips.push('docs_linked');
  if (audit.jsonld_detected === true) chips.push('jsonld_detected');
  if (audit.software_application_schema_detected === true) chips.push('software_schema_detected');
  return chips;
}

function collectionTags(source) {
  return unique([source?.primary_category, source?.suggested_category, ...(source?.collection_tag_candidates ?? [])].filter(Boolean));
}

function makeImportManifest(reviewReady, reviewBlocked) {
  return {
    generated_by: 'AGENT7_REVIEW_QUEUE_PACKAGER',
    dry_run: true,
    admin_review_only: true,
    auto_publish: false,
    public_projection: false,
    outputs: {
      review_ready_jsonl: 'review-ready.jsonl',
      review_blocked_jsonl: 'review-blocked.jsonl',
      admin_summary_md: 'admin-summary.md'
    },
    counts: {
      review_ready: reviewReady.length,
      review_blocked: reviewBlocked.length
    }
  };
}

function makeAdminSummary(reviewReady, reviewBlocked) {
  const lines = [
    '# AGENT7 Review Queue Package',
    '',
    'This package is for 88CN admin review only. It is not a publish action.',
    '',
    `- Review ready: ${reviewReady.length}`,
    `- Review blocked: ${reviewBlocked.length}`,
    '- Auto-publish: false',
    '- Public projection write: false',
    ''
  ];
  if (reviewBlocked.length > 0) {
    lines.push('## Blocked Rows', '');
    for (const row of reviewBlocked) {
      lines.push(`- ${row.project_name}: ${row.review_blockers.join(', ')}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function indexByProject(rows) {
  const map = new Map();
  for (const row of rows) map.set(projectKey(row.project_name), row);
  return map;
}

function groupByProject(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = projectKey(row.project_name);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function projectKey(value) {
  return normalizeProjectName(value ?? '');
}

function slugify(value) {
  return normalizeProjectName(value).replace(/\s+/g, '-');
}

function domainToUrl(value) {
  if (!value) return null;
  return `https://${value}`;
}

function repoToUrl(value) {
  if (!value) return null;
  return `https://github.com/${value}`;
}

function toJsonl(rows) {
  return rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length > 0 ? '\n' : '');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values)];
}
