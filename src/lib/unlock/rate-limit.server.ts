/**
 * Basic in-memory sliding-window rate limiter. Per serverless instance only
 * (good enough to slow down email guessing; not a hard global limit).
 */
const buckets = new Map<string, number[]>();

export function rateLimitHit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const since = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > since);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => t <= since)) buckets.delete(k);
    }
  }
  return false;
}

export function resetRateLimits(): void {
  buckets.clear();
}
