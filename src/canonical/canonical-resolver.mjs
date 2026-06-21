import { candidateSlug, normalizeDomain, normalizeGithubRepoUrl, normalizeProjectName } from './normalizers.mjs';

const AMBIGUITY_STATES = new Set([
  'possible_duplicate',
  'duplicate_confirmed_by_exact_source',
  'ambiguous_parent_brand',
  'ambiguous_product_scope',
  'one_domain_many_repos',
  'one_repo_many_domains',
  'renamed_project',
  'quarantined_identity_conflict'
]);

export const AGENT4_RESULT_CODE = 'AGENT4_CANONICAL_ENTITY_AGENT_READY_DRY_RUN';

export function runCanonicalEntityDryRun(rows) {
  const candidates = resolveCanonicalCandidates(rows);
  return {
    result_code: AGENT4_RESULT_CODE,
    dry_run: true,
    network_used: false,
    production_write: false,
    auto_publish: false,
    candidates,
    summary: {
      total: candidates.length,
      ready_for_review: candidates.filter((row) => row.review_status === 'ready_for_review').length,
      needs_canonical_review: candidates.filter((row) => row.review_status === 'needs_canonical_review').length,
      quarantined_identity_conflict: candidates.filter((row) => row.states.includes('quarantined_identity_conflict')).length
    }
  };
}

export function resolveCanonicalCandidates(rows) {
  const normalized = rows.map((row, index) => normalizeRow(row, index));
  const byDomain = groupBy(normalized, (row) => row.normalized_domain);
  const byRepo = groupBy(normalized, (row) => row.normalized_github_repo);
  const byName = groupBy(normalized, (row) => row.normalized_name);

  return normalized.map((row) => {
    const states = new Set();
    const domainGroup = row.normalized_domain ? byDomain.get(row.normalized_domain) ?? [] : [];
    const repoGroup = row.normalized_github_repo ? byRepo.get(row.normalized_github_repo) ?? [] : [];
    const nameGroup = row.normalized_name ? byName.get(row.normalized_name) ?? [] : [];

    if (domainGroup.length > 1 && unique(domainGroup.map((item) => item.normalized_github_repo)).length > 1) {
      states.add('one_domain_many_repos');
    }
    if (repoGroup.length > 1 && unique(repoGroup.map((item) => item.normalized_domain)).length > 1) {
      states.add('one_repo_many_domains');
    }
    if (domainGroup.length > 1 && repoGroup.length > 1 && row.normalized_domain && row.normalized_github_repo) {
      const exactSourceMatches = normalized.filter(
        (item) =>
          item.normalized_domain === row.normalized_domain &&
          item.normalized_github_repo === row.normalized_github_repo
      );
      if (exactSourceMatches.length > 1) states.add('duplicate_confirmed_by_exact_source');
    }
    if (nameGroup.length > 1 || domainGroup.length > 1 || repoGroup.length > 1) {
      states.add('possible_duplicate');
    }
    if (hasRenamedSignal(row)) states.add('renamed_project');
    if (looksLikeParentBrand(row, rows)) states.add('ambiguous_parent_brand');
    if (looksLikeProductScopeConflict(row)) states.add('ambiguous_product_scope');
    if (!row.normalized_domain && !row.normalized_github_repo) states.add('quarantined_identity_conflict');

    if (states.size === 0) states.add('not_duplicate');
    const reviewStatus = [...states].some((state) => AMBIGUITY_STATES.has(state))
      ? 'needs_canonical_review'
      : 'ready_for_review';
    if (reviewStatus === 'needs_canonical_review') states.add('needs_canonical_review');

    return {
      candidate_id: `${row.batch_id ?? 'canonical'}:${row.row_index}`,
      batch_id: row.batch_id ?? null,
      row_index: row.row_index,
      project_name: row.name,
      canonical_slug: candidateSlug(row.name),
      normalized_name: row.normalized_name,
      normalized_domain: row.normalized_domain,
      normalized_github_repo: row.normalized_github_repo,
      identity_kind: classifyIdentity(row),
      states: [...states],
      review_status: reviewStatus,
      auto_publish: false,
      public_projection: false
    };
  });
}

function normalizeRow(row, index) {
  return {
    ...row,
    row_index: row.row_index ?? index,
    batch_id: row.batch_id,
    name: row.name ?? row.project_name ?? '',
    normalized_name: normalizeProjectName(row.name ?? row.project_name ?? ''),
    normalized_domain: normalizeDomain(row.official_url ?? row.domain),
    normalized_github_repo: normalizeGithubRepoUrl(row.public_github_url ?? row.github_repo_url)
  };
}

function groupBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function looksLikeParentBrand(row, allRows) {
  if (!row.normalized_name) return false;
  return allRows.some((other) => {
    const otherName = normalizeProjectName(other.name ?? other.project_name ?? '');
    return otherName !== row.normalized_name && otherName.startsWith(`${row.normalized_name} `);
  });
}

function looksLikeProductScopeConflict(row) {
  const name = row.normalized_name;
  return /\b(model|platform|cloud|studio|api|agent|suite)\b/.test(name);
}

function hasRenamedSignal(row) {
  if (!Array.isArray(row.previous_names)) return false;
  return row.previous_names
    .map((name) => normalizeProjectName(name))
    .some((name) => name && name !== row.normalized_name);
}

function classifyIdentity(row) {
  const name = row.normalized_name;
  if (/\b(model|llm)\b/.test(name)) return 'model_family';
  if (/\bplatform|cloud|suite\b/.test(name)) return 'related_platform';
  if (row.normalized_github_repo && row.normalized_domain) return 'product';
  if (row.normalized_domain) return 'organization';
  return 'unknown';
}
