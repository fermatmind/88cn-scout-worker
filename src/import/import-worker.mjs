import { validateItem, validateManifest } from './validators.mjs';

export function runBulkImportDryRun(manifest) {
  const manifestValidation = validateManifest(manifest);
  if (!manifestValidation.ok) {
    return {
      batch_id: manifest?.batch_id ?? 'unknown',
      dry_run: true,
      status: 'rejected_manifest',
      accepted: [],
      needs_review: [],
      rejected: [],
      quarantine: manifestValidation.errors.map((reason) => ({
        reason,
        severity: 'high',
        public_summary: 'Manifest rejected before row processing.'
      })),
      rollback_plan: {
        batch_id: manifest?.batch_id ?? 'unknown',
        action: 'none',
        reason: 'dry-run manifest rejection; no writes performed'
      }
    };
  }

  const seenHashes = new Set();
  const accepted = [];
  const needsReview = [];
  const rejected = [];
  const quarantine = [];

  manifest.items.forEach((item, index) => {
    const validation = validateItem(item);
    const base = {
      batch_id: manifest.batch_id,
      row_index: index,
      source: manifest.source,
      row_hash: validation.normalized?.row_hash ?? null,
      no_public_projection: true
    };

    if (!validation.ok) {
      const row = { ...base, status: 'rejected', reasons: validation.errors };
      rejected.push(row);
      quarantine.push({
        ...base,
        reason: validation.errors.includes('row_hash_mismatch') ? 'malformed_payload' : 'manual_review_required',
        severity: validation.errors.includes('row_hash_mismatch') ? 'high' : 'medium',
        public_summary: 'Row rejected by local dry-run validation.'
      });
      return;
    }

    if (seenHashes.has(validation.normalized.row_hash)) {
      const row = { ...base, status: 'needs_review', reasons: ['duplicate_row_hash'] };
      needsReview.push(row);
      quarantine.push({
        ...base,
        reason: 'duplicate',
        severity: 'medium',
        public_summary: 'Duplicate row requires maintainer review.'
      });
      return;
    }
    seenHashes.add(validation.normalized.row_hash);

    const evidence = mapSourceEvidence(validation.normalized);
    const row = {
      ...base,
      status: evidence.length >= 2 ? 'accepted' : 'needs_review',
      project: validation.normalized,
      source_evidence: evidence
    };

    if (row.status === 'accepted') accepted.push(row);
    else needsReview.push({ ...row, reasons: ['insufficient_source_evidence'] });
  });

  return {
    batch_id: manifest.batch_id,
    batch_hash: manifestValidation.expectedBatchHash,
    dry_run: true,
    status: 'dry_run_complete',
    accepted,
    needs_review: needsReview,
    rejected,
    quarantine,
    summary: {
      total: manifest.items.length,
      accepted: accepted.length,
      needs_review: needsReview.length,
      rejected: rejected.length,
      quarantined: quarantine.length
    },
    rollback_plan: {
      batch_id: manifest.batch_id,
      action: 'delete_by_batch_id_if_future_write_occurs',
      dry_run_only: true,
      writes_performed: 0
    },
    no_public_projection: true,
    automatic_published_projection: false,
    production_write: false
  };
}

function mapSourceEvidence(project) {
  return [
    ['official_site', project.official_url],
    ['public_repo', project.public_github_url],
    ['public_docs', project.public_docs_url],
    ['public_pricing', project.public_pricing_url],
    ['public_launch', project.public_launch_url]
  ]
    .filter(([, url]) => Boolean(url))
    .map(([kind, url]) => ({ kind, url }));
}
