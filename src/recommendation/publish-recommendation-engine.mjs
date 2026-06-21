export const AGENT8_RESULT_CODE = 'AGENT8_PUBLISH_RECOMMENDATION_READY_NO_AUTOPUBLISH';

export const RECOMMENDATION_VALUES = [
  'recommend_publish',
  'recommend_review',
  'recommend_quarantine',
  'recommend_reject',
  'recommend_recheck'
];

const REQUIRED_REVIEW_FIELDS = ['project_name', 'slug_candidate', 'official_website_url'];

export function runPublishRecommendationDryRun(reviewPayloads = []) {
  const recommendations = reviewPayloads.map((payload) => recommendForPayload(payload));
  return {
    result_code: AGENT8_RESULT_CODE,
    dry_run: true,
    network_used: false,
    production_write: false,
    auto_publish: false,
    published: false,
    public_projection: false,
    recommendations,
    summary: {
      total: recommendations.length,
      by_recommendation: countBy(recommendations, (row) => row.recommendation),
      recommend_publish_is_not_published: true,
      auto_publish: false,
      published: false,
      public_projection: false
    }
  };
}

export function recommendForPayload(payload = {}) {
  const missingFields = REQUIRED_REVIEW_FIELDS.filter((field) => !payload[field]);
  const blockers = asArray(payload.review_blockers);
  const riskFlags = collectRiskFlags(payload, blockers);
  const reasonCodes = collectReasonCodes(payload, blockers, missingFields, riskFlags);
  const recommendation = chooseRecommendation(payload, blockers, missingFields, riskFlags);

  return {
    project_name: payload.project_name || 'unknown-project',
    slug_candidate: payload.slug_candidate || 'missing-slug-candidate',
    recommendation,
    reason_codes: reasonCodes,
    missing_fields: missingFields,
    risk_flags: riskFlags,
    human_review_notes: makeHumanReviewNotes(recommendation, payload, blockers),
    no_public_claim: true,
    published: false,
    auto_publish: false,
    public_projection: false
  };
}

function chooseRecommendation(payload, blockers, missingFields, riskFlags) {
  if (riskFlags.includes('copied_content_risk') || riskFlags.includes('pii_or_private_data_risk')) {
    return 'recommend_reject';
  }
  if (riskFlags.some((flag) => flag.startsWith('quarantine:'))) {
    return 'recommend_quarantine';
  }
  if (payload.audit_status === 'audit_attention_needed' || payload.audit_status === 'audit_warning') {
    return 'recommend_recheck';
  }
  if (missingFields.length > 0 || blockers.length > 0) {
    return 'recommend_review';
  }
  if (
    payload.source_status === 'source_verified' &&
    payload.canonical_status === 'ready_for_review' &&
    payload.audit_status === 'audit_passed'
  ) {
    return 'recommend_publish';
  }
  return 'recommend_review';
}

function collectRiskFlags(payload, blockers) {
  const flags = [];
  for (const blocker of blockers) {
    if (blocker.startsWith('quarantine:')) flags.push(blocker);
    if (blocker.includes('copied_content_risk')) flags.push('copied_content_risk');
    if (blocker.includes('pii_or_private_data_risk')) flags.push('pii_or_private_data_risk');
  }
  if (payload.source_status !== 'source_verified') flags.push('source_not_verified');
  if (payload.canonical_status !== 'ready_for_review') flags.push('canonical_review_needed');
  if (payload.audit_status !== 'audit_passed') flags.push('audit_not_passed');
  return unique(flags);
}

function collectReasonCodes(payload, blockers, missingFields, riskFlags) {
  const codes = [];
  if (missingFields.length === 0) codes.push('required_fields_present');
  else codes.push('missing_required_fields');
  if (blockers.length === 0) codes.push('no_review_blockers');
  else codes.push('review_blockers_present');
  codes.push(`source:${payload.source_status ?? 'unknown'}`);
  codes.push(`canonical:${payload.canonical_status ?? 'unknown'}`);
  codes.push(`audit:${payload.audit_status ?? 'unknown'}`);
  for (const flag of riskFlags) codes.push(`risk:${flag}`);
  return unique(codes);
}

function makeHumanReviewNotes(recommendation, payload, blockers) {
  const notes = ['Recommendation only; 88CN admin review is required before any publication.'];
  if (recommendation === 'recommend_publish') {
    notes.push('Clean recommendation does not create published state or public projection.');
  }
  if (blockers.length > 0) {
    notes.push(`Review blockers: ${blockers.join(', ')}`);
  }
  if (payload.original_summary_candidate) {
    notes.push('Summary candidate must be checked for originality and public-safe claims.');
  }
  return notes;
}

function countBy(rows, keyFn) {
  const counts = Object.fromEntries(RECOMMENDATION_VALUES.map((value) => [value, 0]));
  for (const row of rows) counts[keyFn(row)] += 1;
  return counts;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values)];
}
