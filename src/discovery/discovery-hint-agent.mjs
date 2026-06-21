import fs from 'node:fs';
import { normalizeUrl } from '../import/validators.mjs';

export const DISCOVERY_SOURCE_TYPES = [
  'github',
  'launch',
  'directory-hints',
  'chinese-outbound',
  'official-site',
  'manual-submit'
];

export const AGENT2_RESULT_CODE = 'AGENT2_DISCOVERY_HINT_AGENT_READY_DRY_RUN';

export function readSeedHintJsonl(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        return {
          __parse_error: true,
          __line_index: index
        };
      }
    });
}

export function runDiscoveryHintDryRun(seedHints) {
  const normalized = [];
  const weak_hints = [];
  const rejected = [];
  const events = [];

  seedHints.forEach((hint, index) => {
    const result = normalizeDiscoveryHint(hint, index);
    events.push({
      event: 'discovery_hint_processed',
      row_index: index,
      status: result.status,
      reason_codes: result.reason_codes
    });

    if (result.status === 'accepted') normalized.push(result.hint);
    else if (result.status === 'weak_hint') weak_hints.push(result.hint);
    else rejected.push(result.rejection);
  });

  return {
    result_code: AGENT2_RESULT_CODE,
    dry_run: true,
    network_used: false,
    production_write: false,
    auto_publish: false,
    normalized,
    weak_hints,
    rejected,
    events,
    summary: {
      total: seedHints.length,
      normalized: normalized.length,
      weak_hints: weak_hints.length,
      rejected: rejected.length
    }
  };
}

export function normalizeDiscoveryHint(hint, rowIndex = 0) {
  if (!hint || typeof hint !== 'object' || Array.isArray(hint) || hint.__parse_error) {
    return reject(rowIndex, ['invalid_json_or_object']);
  }

  const reasonCodes = [];
  const projectName = typeof hint.project_name === 'string' ? hint.project_name.trim() : '';
  const sourceUrl = normalizeUrl(hint.source_url);
  const sourceType = DISCOVERY_SOURCE_TYPES.includes(hint.source_type) ? hint.source_type : null;
  const officialWebsiteUrl = normalizeUrl(hint.official_website_url);
  const githubUrl = normalizeUrl(hint.github_url);
  const docsUrl = normalizeUrl(hint.docs_url);

  if (!projectName) reasonCodes.push('missing_project_name');
  if (!sourceUrl) reasonCodes.push('invalid_source_url');
  if (!sourceType) reasonCodes.push('invalid_source_type');

  if (reasonCodes.length > 0) return reject(rowIndex, reasonCodes);

  if (!officialWebsiteUrl && sourceType !== 'official-site') reasonCodes.push('missing_official_website');
  if (!githubUrl) reasonCodes.push('missing_github_url');
  if (!docsUrl) reasonCodes.push('missing_docs_url');
  if (sourceType === 'directory-hints') reasonCodes.push('directory_hint_only');
  if ('description' in hint || 'summary' in hint) reasonCodes.push('copied_content_not_used');
  if ('score' in hint || 'ranking' in hint || 'rank' in hint) reasonCodes.push('ranking_not_imported');

  const confidence = scoreConfidence({
    sourceType,
    officialWebsiteUrl,
    githubUrl,
    docsUrl,
    reasonCodes
  });

  const normalizedHint = {
    project_name: projectName,
    source_url: sourceUrl,
    official_website_url: officialWebsiteUrl,
    github_url: githubUrl,
    docs_url: docsUrl,
    source_type: sourceType,
    suggested_category: normalizeCategory(hint.suggested_category),
    discovered_at: typeof hint.discovered_at === 'string' ? hint.discovered_at : null,
    confidence,
    reason_codes: reasonCodes,
    auto_publish: false
  };

  return {
    status: confidence >= 0.6 ? 'accepted' : 'weak_hint',
    reason_codes: reasonCodes,
    hint: normalizedHint
  };
}

function reject(rowIndex, reasonCodes) {
  return {
    status: 'rejected',
    reason_codes: reasonCodes,
    rejection: {
      row_index: rowIndex,
      reason_codes: reasonCodes,
      auto_publish: false
    }
  };
}

function normalizeCategory(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)) return null;
  return trimmed;
}

function scoreConfidence({ sourceType, officialWebsiteUrl, githubUrl, docsUrl, reasonCodes }) {
  let score = 0.2;
  if (sourceType === 'official-site') score += 0.25;
  if (sourceType === 'github') score += 0.2;
  if (sourceType === 'launch') score += 0.15;
  if (sourceType === 'manual-submit') score += 0.15;
  if (officialWebsiteUrl) score += 0.25;
  if (githubUrl) score += 0.15;
  if (docsUrl) score += 0.1;
  if (reasonCodes.includes('directory_hint_only')) score -= 0.2;
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}
