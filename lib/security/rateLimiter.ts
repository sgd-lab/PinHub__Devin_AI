import "server-only";

/**
 * In-memory token-bucket-ish rate limiter for AI endpoints. Keeps a
 * rolling 60-second window of timestamps per user and rejects further
 * requests once the count exceeds the configured limit.
 *
 * This is intentionally simple — for a multi-instance Vercel deployment
 * each instance has its own bucket, so the *effective* limit can be a
 * small multiple of the configured value. That's acceptable: the goal
 * is to stop a single tab from spamming us, not to enforce a global
 * billing quota (that's what `ai_usage_log` is for).
 *
 * Configurable via the `RATE_LIMIT_RPM` env var (default 20).
 */

const DEFAULT_LIMIT = 20;

function readLimit(): number {
  const raw = process.env.RATE_LIMIT_RPM;
  if (!raw) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return n;
}

interface Bucket {
  timestamps: number[];
}

type GlobalWithBuckets = typeof globalThis & {
  __pinhub_rate_buckets__?: Map<string, Bucket>;
};

function getStore(): Map<string, Bucket> {
  const g = globalThis as GlobalWithBuckets;
  if (!g.__pinhub_rate_buckets__) {
    g.__pinhub_rate_buckets__ = new Map();
  }
  return g.__pinhub_rate_buckets__;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
}

/**
 * Record a request from `userId` against the rolling window and decide
 * whether it should be allowed. `bucket` lets the same user have
 * separate budgets for different endpoint families (e.g. "chat",
 * "generate") if we want to tune them later — defaults to "ai".
 */
export function rateLimit(
  userId: string,
  bucket = "ai"
): RateLimitResult {
  const limit = readLimit();
  const now = Date.now();
  const windowMs = 60_000;
  const cutoff = now - windowMs;

  const store = getStore();
  const key = `${bucket}:${userId}`;
  const b = store.get(key) ?? { timestamps: [] };
  b.timestamps = b.timestamps.filter((t) => t > cutoff);

  if (b.timestamps.length >= limit) {
    // Oldest timestamp in the window controls when the next slot frees up.
    const oldest = b.timestamps[0];
    const resetAtMs = oldest + windowMs;
    store.set(key, b);
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAtMs,
    };
  }

  b.timestamps.push(now);
  store.set(key, b);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - b.timestamps.length),
    resetAtMs: now + windowMs,
  };
}

/** Convert a RateLimitResult to the standard X-RateLimit-* headers. */
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.ceil(r.resetAtMs / 1000)),
  };
}
