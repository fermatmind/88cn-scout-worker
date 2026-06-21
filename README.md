# 88CN Scout Worker

Private no-runtime bootstrap repository for the future 88CN scout worker pipeline.

This repository currently contains documentation, boundary notes, fixtures guidance, JSON contracts, a no-runtime agent CLI contract, and local dry-run worker modules. It does not contain a runtime daemon, package metadata, dependencies, secrets, queue clients, crawler code, live audit clients, Supabase clients, deploy config, or production runtime wiring.

## Current Scope

- Import batch contract skeleton.
- Bounded import dry-run parser, validator, router, and output writer.
- Canonical candidate contract skeleton.
- Audit observation contract skeleton.
- Quarantine event contract skeleton.
- AGENT1 no-runtime CLI contract, input manifest, output artifact shape, fixture, and validation.
- AGENT2 Discovery Hint Agent for fixture/local-batch normalization of public-safe source hints.
- Documentation for future import, canonical, audit, quarantine, queue, and report modules.

## Not In Scope

- Runtime worker process.
- Redis or queue creation.
- External HTTP audit.
- Crawler execution.
- Supabase/staging/production writes.
- Public API or MCP server.
- Frontend routes.
- Deploy scripts or cloud/server mutation.
- Private seed handoff or raw project rows.
- Secrets, credentials, `.env`, DB URLs, or Redis URLs.

Future implementation work must be separately approved and scoped before adding runtime code.

## AGENT1 CLI Contract

The AGENT1 runner is a local dry-run contract only:

```bash
node ./src/cli/agent-runner.mjs \
  --agent AGENT1 \
  --manifest fixtures/agent1/sample-agent-run-manifest.json \
  --out tmp/agent1-smoke \
  --dry-run \
  --no-network
```

Expected result code:

```text
AGENT1_CLI_CONTRACT_READY_NO_RUNTIME
```

The runner writes local artifacts under `tmp/` and performs no network, DB, queue, `published_projection`, sitemap, external outreach, deploy, or server/cloud action.

## AGENT2 Discovery Hint Agent

The AGENT2 discovery module normalizes local seed hints into identity candidates:

```bash
node tests/discovery/discovery-hint-agent.test.mjs
```

Expected result code:

```text
AGENT2_DISCOVERY_HINT_AGENT_READY_DRY_RUN
```

It accepts fixture/local JSONL only. It does not crawl, fetch, copy descriptions, import rankings, publish, write DB rows, mutate `88CN`, or mutate `88cn-index-data`.
