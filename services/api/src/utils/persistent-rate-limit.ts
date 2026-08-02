import crypto from 'crypto';
import prisma from './db';

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Atomically consumes a database-backed counter. It is deliberately shared by
 * legacy password-reset routes and Better Auth so neither path falls back to a
 * process-local memory map.
 */
export async function consumePersistentRateLimit(
  key: string,
  windowMs: number,
  max: number,
): Promise<RateLimitDecision> {
  const now = Date.now();
  const existing = await prisma.rateLimit.findUnique({ where: { key } });

  if (!existing) {
    try {
      await prisma.rateLimit.create({
        data: { id: crypto.randomUUID(), key, count: 1, lastRequest: BigInt(now) },
      });
      return { allowed: true, retryAfterSeconds: 0 };
    } catch {
      // A concurrent request created this key first. Re-read it below.
      return consumePersistentRateLimit(key, windowMs, max);
    }
  }

  const lastRequest = Number(existing.lastRequest);
  if (now - lastRequest > windowMs) {
    const reset = await prisma.rateLimit.updateMany({
      where: { key, lastRequest: existing.lastRequest },
      data: { count: 1, lastRequest: BigInt(now) },
    });
    if (reset.count === 1) return { allowed: true, retryAfterSeconds: 0 };
    return consumePersistentRateLimit(key, windowMs, max);
  }

  const incremented = await prisma.rateLimit.updateMany({
    where: { key, lastRequest: existing.lastRequest, count: { lt: max } },
    data: { count: { increment: 1 }, lastRequest: BigInt(now) },
  });
  if (incremented.count === 1) return { allowed: true, retryAfterSeconds: 0 };

  const current = await prisma.rateLimit.findUnique({ where: { key } });
  if (!current) return consumePersistentRateLimit(key, windowMs, max);
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((Number(current.lastRequest) + windowMs - now) / 1000)),
  };
}
