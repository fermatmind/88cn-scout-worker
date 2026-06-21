# 88CN Scout Worker

Private no-runtime bootstrap repository for the future 88CN scout worker pipeline.

This repository currently contains documentation, boundary notes, fixtures guidance, JSON contracts, and local dry-run worker modules. It does not contain a runtime daemon, package metadata, dependencies, secrets, queue clients, crawler code, live audit clients, Supabase clients, deploy config, or production runtime wiring.

## Current Scope

- Import batch contract skeleton.
- Bounded import dry-run parser, validator, router, and output writer.
- Canonical candidate contract skeleton.
- Audit observation contract skeleton.
- Quarantine event contract skeleton.
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
