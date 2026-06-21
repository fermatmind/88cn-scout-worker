# Canonical Entity Agent

Result: `AGENT4_CANONICAL_ENTITY_AGENT_READY_DRY_RUN`

The Canonical Entity Agent detects duplicate and ambiguous project identity states from local fixture/source-verified records.

It does not auto-merge ambiguous entities, publish canonical results, write `published_projection`, write DB rows, mutate `88CN`, or mutate `88cn-index-data`.

## States

- `not_duplicate`
- `possible_duplicate`
- `duplicate_confirmed_by_exact_source`
- `ambiguous_parent_brand`
- `ambiguous_product_scope`
- `one_domain_many_repos`
- `one_repo_many_domains`
- `renamed_project`
- `needs_canonical_review`
- `quarantined_identity_conflict`

## Validation

```bash
node tests/canonical/canonical-resolver.test.mjs
node tests/worker-boundary-qa.test.mjs
```
