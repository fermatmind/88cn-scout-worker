import fs from 'node:fs';
import path from 'node:path';

export function writeDryRunResult(result, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const files = {
    accepted: path.join(outputDir, 'accepted.jsonl'),
    needs_review: path.join(outputDir, 'needs-review.jsonl'),
    rejected: path.join(outputDir, 'rejected.jsonl'),
    quarantine: path.join(outputDir, 'quarantine.jsonl'),
    rollback: path.join(outputDir, 'rollback-plan.json')
  };

  fs.writeFileSync(files.accepted, toJsonl(result.accepted));
  fs.writeFileSync(files.needs_review, toJsonl(result.needs_review));
  fs.writeFileSync(files.rejected, toJsonl(result.rejected));
  fs.writeFileSync(files.quarantine, toJsonl(result.quarantine));
  fs.writeFileSync(files.rollback, JSON.stringify(result.rollback_plan, null, 2) + '\n');
  return files;
}

function toJsonl(rows) {
  return rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
}
