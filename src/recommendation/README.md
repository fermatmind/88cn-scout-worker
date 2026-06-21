# Recommendation

AGENT8 generates publish recommendations, not publication decisions.

Expected result:

```text
AGENT8_PUBLISH_RECOMMENDATION_READY_NO_AUTOPUBLISH
```

Recommendation values:

- `recommend_publish`
- `recommend_review`
- `recommend_quarantine`
- `recommend_reject`
- `recommend_recheck`

`recommend_publish` is not `published`. Only 88CN admin review can create
published state or `published_projection`.

Validation:

```bash
node tests/recommendation/publish-recommendation-engine.test.mjs
node tests/worker-boundary-qa.test.mjs
```
