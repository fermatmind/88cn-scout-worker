import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readManifest } from '../../src/import/manifest-parser.mjs';
import { runBulkImportDryRun } from '../../src/import/import-worker.mjs';
import { writeDryRunResult } from '../../src/import/dry-run-writer.mjs';

const fixturePath = new URL('../../fixtures/import/sample-batch-manifest.json', import.meta.url);
const { manifest } = readManifest(fixturePath);
const result = runBulkImportDryRun(manifest);

assert.equal(result.dry_run, true);
assert.equal(result.production_write, false);
assert.equal(result.no_public_projection, true);
assert.equal(result.automatic_published_projection, false);
assert.equal(result.status, 'dry_run_complete');
assert.equal(result.accepted.length, 1);
assert.equal(result.needs_review.length, 1);
assert.equal(result.rejected.length, 1);
assert.equal(result.quarantine.length, 1);
assert.equal(result.rollback_plan.writes_performed, 0);
assert.equal(result.accepted[0].source_evidence.length >= 2, true);
assert.deepEqual(result.rejected[0].reasons, [
  'missing_name',
  'invalid_official_url',
  'invalid_category_slug'
]);

const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), '88cn-import-dry-run-'));
const files = writeDryRunResult(result, outputDir);
for (const file of Object.values(files)) {
  assert.equal(fs.existsSync(file), true);
}

console.log('import-worker.test passed');
