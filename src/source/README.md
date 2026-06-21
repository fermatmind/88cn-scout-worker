# Official Source Resolver Agent

Result: `AGENT3_OFFICIAL_SOURCE_RESOLVER_READY_DRY_RUN`

The Official Source Resolver consumes normalized discovery hints and classifies whether a project has enough official source identity to move forward.

It is fixture/local-only. It does not perform live HTTP checks, logins, browser automation, crawler execution, source writes, or publication.

## Output States

- `source_verified`
- `source_missing`
- `source_conflict`
- `needs_manual_source_review`

Directory pages remain discovery-only and never become official sources by themselves.

## Validation

```bash
node tests/source/official-source-resolver.test.mjs
node tests/worker-boundary-qa.test.mjs
```
