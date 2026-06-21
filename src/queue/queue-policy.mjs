export const DEFAULT_QUEUE_POLICY = {
  namespace: '88cn.scout.local',
  max_attempts: 3,
  default_concurrency: 3,
  backoff_ms: 250,
  dead_letter_required: true,
  per_domain_cooldown_required_for_audit_jobs: true,
  redis_connection_allowed: false,
  shared_redis_allowed: false,
  fermatmind_redis_allowed: false,
  tencent_redis_allowed: false
};

export function validateQueuePolicy(policy = DEFAULT_QUEUE_POLICY) {
  const errors = [];
  if (policy.max_attempts > 3) errors.push('max_attempts_exceeds_limit');
  if (policy.default_concurrency > 3) errors.push('default_concurrency_exceeds_limit');
  if (policy.dead_letter_required !== true) errors.push('dead_letter_required');
  if (policy.redis_connection_allowed !== false) errors.push('redis_connection_forbidden');
  return { ok: errors.length === 0, errors };
}
