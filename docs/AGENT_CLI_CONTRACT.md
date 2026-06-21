# Agent CLI Contract

Result: `AGENT1_CLI_CONTRACT_READY_NO_RUNTIME`

The worker agent CLI is a deterministic local dry-run contract. It is not a runtime worker, crawler, queue daemon, live HTTP auditor, or production writer.

## Command

```bash
node ./src/cli/agent-runner.mjs \
  --agent <AGENT_NAME> \
  --manifest <path> \
  --out <output_dir> \
  --dry-run \
  --no-network
```

Required defaults:

- `--dry-run` is required.
- `--no-network` is required.
- manifest `network` must be `disabled`.
- manifest `write_policy` must be `local_artifacts_only`.
- output must be inside the worker repo under `tmp/` or `fixtures/agent1/output/`.

## Input Manifest

Canonical schema:

```text
contracts/agent-run-manifest.schema.json
```

Fixture:

```text
fixtures/agent1/sample-agent-run-manifest.json
```

## Output Artifacts

The CLI writes exactly these local artifacts:

```text
manifest.json
result.json
events.jsonl
quarantine.jsonl
review-ready.jsonl
report.md
```

These artifacts are local dry-run output only. They are not imported into `88CN`, `published_projection`, sitemap, Supabase, production DB, or `88cn-index-data`.

## Exit Codes

| Code | Meaning |
| --- | --- |
| 0 | dry-run contract completed |
| 1 | CLI runtime error such as unsafe output path |
| 2 | missing required CLI flag or missing dry-run/no-network guard |
| 3 | invalid manifest or agent mismatch |

## Forbidden

- runtime daemon;
- crawler;
- live HTTP audit by default;
- Redis/queue runtime;
- Supabase/staging/production write;
- `88CN` repo mutation;
- `published_projection` write;
- sitemap mutation;
- `88cn-index-data` mutation;
- deploy/server/cloud action;
- external outreach;
- `.env` or secret reads.

## Validation

```bash
node scripts/validate-agent-contracts.mjs
node tests/agent1/agent-runner.test.mjs
node tests/worker-boundary-qa.test.mjs
git diff --check
```
