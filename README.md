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
- AGENT3 Official Source Resolver Agent for fixture/local-only official URL, GitHub repo, and docs-domain classification.
- AGENT4 Canonical Entity Agent for duplicate, rename, parent-brand, product-scope, domain/repo conflict, and quarantine identity classification.
- AGENT5 HTTP Audit Agent for fixture-default HTTP observation classification.
- AGENT6 Quarantine Classifier Agent for private worker/admin quarantine events, blockers, retry recommendations, and safe exclusion reasons.
- AGENT7 Review Queue Packager Agent for local admin review-ready and review-blocked payload packages.
- AGENT8 Publish Recommendation Engine for recommendation-only decisions with no published state.
- AGENTQ no-auto-publish QA over AGENT1-AGENT8.
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

## AGENT3 Official Source Resolver

The AGENT3 source resolver classifies normalized discovery hints into source states:

```bash
node tests/source/official-source-resolver.test.mjs
```

Expected result code:

```text
AGENT3_OFFICIAL_SOURCE_RESOLVER_READY_DRY_RUN
```

It performs local URL/domain/GitHub repo normalization only. It does not perform live HTTP checks, logins, browser automation, crawler execution, source writes, or publication.

## AGENT4 Canonical Entity Agent

The AGENT4 canonical module classifies identity ambiguity and duplicate states:

```bash
node tests/canonical/canonical-resolver.test.mjs
```

Expected result code:

```text
AGENT4_CANONICAL_ENTITY_AGENT_READY_DRY_RUN
```

It does not auto-merge ambiguous entities, publish canonical results, write `published_projection`, write DB rows, mutate `88CN`, or mutate `88cn-index-data`.

## AGENT5 HTTP Audit Agent

The AGENT5 audit module classifies local fixture responses into HTTP-first audit observations:

```bash
node tests/audit/http-audit-worker.test.mjs
```

Expected result code:

```text
AGENT5_HTTP_AUDIT_AGENT_READY_FIXTURE_DEFAULT
```

It is fixture-default and dry-run only. It does not perform live HTTP, crawler execution, browser or Playwright fallback, WAF bypass, proxy evasion, login/cookie/session scraping, DB writes, sitemap mutation, `published_projection` writes, deploy, publication, or mutation of `88CN` / `88cn-index-data`.

## AGENT6 Quarantine Classifier Agent

The AGENT6 quarantine module classifies unresolved or unsafe records into private worker/admin buckets:

```bash
node tests/quarantine/quarantine-classifier.test.mjs
```

Expected result code:

```text
AGENT6_QUARANTINE_CLASSIFIER_READY
```

Quarantine is not rejection and not publication. It produces review blockers, retry recommendations, and safe exclusion reasons only; it does not delete data, write DB rows, expose quarantine internals publicly, write `published_projection`, mutate sitemap, publish, deploy, or mutate `88CN` / `88cn-index-data`.

## AGENT7 Review Queue Packager Agent

The AGENT7 review module packages source, canonical, audit, and quarantine outputs into local admin-review payload files:

```bash
node tests/review/review-queue-packager.test.mjs
```

Expected result code:

```text
AGENT7_REVIEW_QUEUE_PACKAGER_READY
```

It emits `review-ready.jsonl`, `review-blocked.jsonl`, `admin-summary.md`, and `import-manifest.json` content in dry-run memory. It does not write directly to `88CN`, write `published_projection`, mutate sitemap, publicize quarantine internals, publish, deploy, or mutate `88cn-index-data`.

## AGENT8 Publish Recommendation Engine

The AGENT8 recommendation module turns review payloads into recommendation-only rows:

```bash
node tests/recommendation/publish-recommendation-engine.test.mjs
```

Expected result code:

```text
AGENT8_PUBLISH_RECOMMENDATION_READY_NO_AUTOPUBLISH
```

It can emit `recommend_publish`, `recommend_review`, `recommend_quarantine`, `recommend_reject`, or `recommend_recheck`. `recommend_publish` is not `published`; this module does not write DB rows, create `published_projection`, mutate sitemap, publish, deploy, or mutate `88CN` / `88cn-index-data`.

## AGENTQ No-Auto-Publish QA

AGENTQ validates the no-runtime and no-auto-publish boundary across AGENT1-AGENT8:

```bash
node tests/worker-boundary-qa.test.mjs
```

Expected result code:

```text
PASS_AGENTQ_NO_AUTO_PUBLISH_QA
```
