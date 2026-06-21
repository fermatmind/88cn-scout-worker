# Discovery Hint Agent

Result: `AGENT2_DISCOVERY_HINT_AGENT_READY_DRY_RUN`

The Discovery Hint Agent transforms local seed hints into normalized identity candidates. It is fixture/local-batch only.

It does not crawl, fetch, copy descriptions, import rankings, publish, write DB rows, mutate `88CN`, or mutate `88cn-index-data`.

## Allowed Source Types

- `github`
- `launch`
- `directory-hints`
- `chinese-outbound`
- `official-site`
- `manual-submit`

## Output Fields

- `project_name`
- `source_url`
- `official_website_url`
- `github_url`
- `docs_url`
- `source_type`
- `suggested_category`
- `discovered_at`
- `confidence`
- `reason_codes`

## Validation

```bash
node tests/discovery/discovery-hint-agent.test.mjs
node tests/worker-boundary-qa.test.mjs
```
