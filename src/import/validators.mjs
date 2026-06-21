import { hashObject } from './hash.mjs';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function validateItem(item) {
  const errors = [];
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return { ok: false, errors: ['item_not_object'] };
  }

  if (typeof item.name !== 'string' || item.name.trim() === '') errors.push('missing_name');
  const officialUrl = normalizeUrl(item.official_url);
  if (!officialUrl) errors.push('invalid_official_url');
  if (item.category_slug !== undefined && !SLUG_PATTERN.test(item.category_slug)) {
    errors.push('invalid_category_slug');
  }
  for (const field of ['public_github_url', 'public_docs_url', 'public_pricing_url', 'public_launch_url']) {
    if (item[field] !== undefined && !normalizeUrl(item[field])) errors.push(`invalid_${field}`);
  }

  const hashSource = {
    name: item.name?.trim() ?? '',
    official_url: officialUrl ?? '',
    public_github_url: normalizeUrl(item.public_github_url) ?? null,
    public_docs_url: normalizeUrl(item.public_docs_url) ?? null,
    category_slug: item.category_slug ?? null
  };
  const expectedRowHash = hashObject(hashSource);
  if (item.row_hash !== undefined && item.row_hash !== expectedRowHash) {
    errors.push('row_hash_mismatch');
  }

  return {
    ok: errors.length === 0,
    errors,
    normalized: {
      name: item.name?.trim(),
      official_url: officialUrl,
      public_github_url: normalizeUrl(item.public_github_url),
      public_docs_url: normalizeUrl(item.public_docs_url),
      public_pricing_url: normalizeUrl(item.public_pricing_url),
      public_launch_url: normalizeUrl(item.public_launch_url),
      category_slug: item.category_slug ?? null,
      row_hash: expectedRowHash
    }
  };
}

export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, errors: ['manifest_not_object'] };
  }
  if (typeof manifest.batch_id !== 'string' || manifest.batch_id.trim() === '') {
    errors.push('missing_batch_id');
  }
  if (!['reviewed_public_source', 'maintainer_submitted_fixture'].includes(manifest.source)) {
    errors.push('invalid_source');
  }
  if (!Array.isArray(manifest.items)) {
    errors.push('items_not_array');
  } else if (manifest.items.length > 20) {
    errors.push('too_many_items');
  }
  const expectedBatchHash = Array.isArray(manifest.items)
    ? hashObject(manifest.items.map((item) => validateItem(item).normalized?.row_hash ?? 'invalid'))
    : null;
  if (manifest.batch_hash !== undefined && manifest.batch_hash !== expectedBatchHash) {
    errors.push('batch_hash_mismatch');
  }
  return { ok: errors.length === 0, errors, expectedBatchHash };
}
