# Audit

AGENT5 implements fixture-default HTTP audit classification for review support.

Expected result:

```text
AGENT5_HTTP_AUDIT_AGENT_READY_FIXTURE_DEFAULT
```

The audit module evaluates local fixture responses and emits observations for
reachability, redirects, canonical tags, sitemap hints, JSON-LD, docs links,
GitHub links, DNS/TLS failures, WAF blocks, and stale fallback snapshots.

Default boundaries:

- Fixture-only dry-run execution.
- No live HTTP/network use.
- No crawler runtime.
- No browser or Playwright fallback.
- No WAF bypass, proxy evasion, login, cookie, or session scraping.
- No DB, Supabase, `published_projection`, sitemap, deploy, or external writes.

Validation:

```bash
node tests/audit/http-audit-worker.test.mjs
node tests/worker-boundary-qa.test.mjs
```
