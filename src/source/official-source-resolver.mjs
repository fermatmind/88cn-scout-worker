import fs from 'node:fs';
import { normalizeUrl } from '../import/validators.mjs';

export const AGENT3_RESULT_CODE = 'AGENT3_OFFICIAL_SOURCE_RESOLVER_READY_DRY_RUN';

export function readDiscoveryHintJsonl(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        return { __parse_error: true, __line_index: index };
      }
    });
}

export function runOfficialSourceResolverDryRun(discoveryHints) {
  const results = discoveryHints.map((hint, index) => resolveOfficialSource(hint, index));
  return {
    result_code: AGENT3_RESULT_CODE,
    dry_run: true,
    network_used: false,
    production_write: false,
    auto_publish: false,
    results,
    summary: {
      total: results.length,
      source_verified: results.filter((row) => row.source_status === 'source_verified').length,
      source_missing: results.filter((row) => row.source_status === 'source_missing').length,
      source_conflict: results.filter((row) => row.source_status === 'source_conflict').length,
      needs_manual_source_review: results.filter((row) => row.source_status === 'needs_manual_source_review').length
    }
  };
}

export function resolveOfficialSource(hint, rowIndex = 0) {
  if (!hint || typeof hint !== 'object' || Array.isArray(hint) || hint.__parse_error) {
    return baseResult({
      projectName: `row-${rowIndex}`,
      sourceStatus: 'source_missing',
      reasonCodes: ['invalid_hint'],
      manualReviewRequired: true
    });
  }

  const projectName = typeof hint.project_name === 'string' && hint.project_name.trim() ? hint.project_name.trim() : `row-${rowIndex}`;
  const officialUrl = normalizeUrl(hint.official_website_url);
  const docsUrl = normalizeUrl(hint.docs_url);
  const githubRepo = normalizeGithubRepo(hint.github_url);
  const reasonCodes = [];

  if (hint.source_type === 'directory-hints') reasonCodes.push('directory_hint_discovery_only');
  if (!officialUrl) reasonCodes.push('missing_official_website');
  if (!githubRepo) reasonCodes.push('missing_github_repo');
  if (!docsUrl) reasonCodes.push('missing_docs_url');

  const officialDomain = domainOf(officialUrl);
  const docsDomain = domainOf(docsUrl);
  if (officialDomain && docsDomain && !domainsRelated(officialDomain, docsDomain)) {
    reasonCodes.push('docs_domain_conflict');
  }

  let sourceStatus = 'source_verified';
  if (!officialUrl && !githubRepo && !docsUrl) sourceStatus = 'source_missing';
  else if (reasonCodes.includes('docs_domain_conflict')) sourceStatus = 'source_conflict';
  else if (reasonCodes.length > 0) sourceStatus = 'needs_manual_source_review';

  return baseResult({
    projectName,
    sourceStatus,
    officialDomain,
    githubRepo,
    docsDomain,
    reasonCodes,
    manualReviewRequired: sourceStatus !== 'source_verified'
  });
}

function baseResult({
  projectName,
  sourceStatus,
  officialDomain = null,
  githubRepo = null,
  docsDomain = null,
  reasonCodes = [],
  manualReviewRequired = false
}) {
  return {
    project_name: projectName,
    source_status: sourceStatus,
    official_domain: officialDomain,
    github_repo: githubRepo,
    docs_domain: docsDomain,
    reason_codes: reasonCodes,
    manual_review_required: manualReviewRequired,
    auto_publish: false
  };
}

export function normalizeGithubRepo(value) {
  const url = normalizeUrl(value);
  if (!url) return null;
  const parsed = new URL(url);
  if (parsed.hostname.toLowerCase() !== 'github.com') return null;
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts[0]}/${parts[1]}`.toLowerCase();
}

function domainOf(value) {
  const url = normalizeUrl(value);
  if (!url) return null;
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
}

function domainsRelated(left, right) {
  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`);
}
