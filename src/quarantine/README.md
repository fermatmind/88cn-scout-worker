# Quarantine

AGENT6 classifies unresolved or unsafe worker records into private quarantine buckets.

Expected result:

```text
AGENT6_QUARANTINE_CLASSIFIER_READY
```

Inputs are local outputs from discovery, official-source resolution, canonical
identity resolution, and HTTP audit observation. Outputs are worker/admin-only:

- quarantine events;
- review blockers;
- retry recommendations;
- safe exclusion reasons.

Quarantine is not rejection and is not publication. It never deletes source data,
writes DB rows, writes `published_projection`, mutates sitemap, or exposes
quarantine internals to public frontend surfaces.

Validation:

```bash
node tests/quarantine/quarantine-classifier.test.mjs
node tests/worker-boundary-qa.test.mjs
```
