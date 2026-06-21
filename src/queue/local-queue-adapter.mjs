import { DEFAULT_QUEUE_POLICY, validateQueuePolicy } from './queue-policy.mjs';

export class LocalDryRunQueue {
  constructor(policy = DEFAULT_QUEUE_POLICY) {
    const validation = validateQueuePolicy(policy);
    if (!validation.ok) {
      throw new Error(`invalid queue policy: ${validation.errors.join(', ')}`);
    }
    this.policy = policy;
    this.jobs = [];
    this.deadLetters = [];
    this.quarantine = [];
  }

  enqueue(job) {
    const normalized = normalizeJob(job, this.policy);
    this.jobs.push(normalized);
    return normalized;
  }

  run(handler) {
    const results = [];
    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      const result = runJob(job, handler, this.policy);
      results.push(result);
      if (result.status === 'retry_scheduled') this.jobs.push(result.next_job);
      if (result.status === 'dead_lettered') {
        this.deadLetters.push(result.dead_letter);
        this.quarantine.push(result.quarantine_event);
      }
    }
    return {
      dry_run: true,
      redis_connected: false,
      runtime_daemon_started: false,
      results,
      dead_letters: this.deadLetters,
      quarantine: this.quarantine
    };
  }
}

function normalizeJob(job, policy) {
  if (!job || typeof job !== 'object') throw new Error('job_not_object');
  if (!job.job_id) throw new Error('missing_job_id');
  if (!job.kind) throw new Error('missing_job_kind');
  if (job.kind === 'audit' && !job.per_domain_cooldown_ms && policy.per_domain_cooldown_required_for_audit_jobs) {
    throw new Error('audit_job_requires_per_domain_cooldown');
  }
  return {
    job_id: job.job_id,
    namespace: job.namespace ?? policy.namespace,
    kind: job.kind,
    payload: job.payload ?? {},
    attempts: job.attempts ?? 0,
    max_attempts: Math.min(job.max_attempts ?? policy.max_attempts, policy.max_attempts),
    backoff_ms: job.backoff_ms ?? policy.backoff_ms,
    per_domain_cooldown_ms: job.per_domain_cooldown_ms ?? null
  };
}

function runJob(job, handler, policy) {
  const attempts = job.attempts + 1;
  const handled = handler(job);
  if (handled.ok) {
    return {
      job_id: job.job_id,
      status: 'completed',
      attempts,
      output: handled.output ?? null
    };
  }
  if (attempts < job.max_attempts) {
    return {
      job_id: job.job_id,
      status: 'retry_scheduled',
      attempts,
      backoff_ms: job.backoff_ms,
      next_job: { ...job, attempts }
    };
  }
  const reason = handled.reason ?? 'unknown_failure';
  return {
    job_id: job.job_id,
    status: 'dead_lettered',
    attempts,
    dead_letter: {
      job_id: job.job_id,
      namespace: job.namespace,
      kind: job.kind,
      reason,
      attempts,
      max_attempts: job.max_attempts,
      redis_connected: false
    },
    quarantine_event: {
      event_id: `${job.job_id}:dead-letter`,
      reason: 'manual_review_required',
      severity: 'medium',
      public_summary: 'Local dry-run job exhausted retry attempts.',
      failed_job_kind: job.kind
    },
    policy_snapshot: {
      max_attempts: policy.max_attempts,
      default_concurrency: policy.default_concurrency,
      dead_letter_required: policy.dead_letter_required
    }
  };
}
