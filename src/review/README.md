# Review

AGENT7 packages worker outputs into 88CN admin review-ready payloads.

Expected result:

```text
AGENT7_REVIEW_QUEUE_PACKAGER_READY
```

Outputs are local dry-run package files:

- `review-ready.jsonl`
- `review-blocked.jsonl`
- `admin-summary.md`
- `import-manifest.json`

The package is for admin review only. It never writes `88CN`, `88cn-index-data`,
DB rows, `published_projection`, sitemap, public frontend surfaces, or publish
state.

Validation:

```bash
node tests/review/review-queue-packager.test.mjs
node tests/worker-boundary-qa.test.mjs
```
