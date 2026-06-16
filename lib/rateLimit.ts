/**
 * Best-effort per-key rate limiting via Upstash Redis (REST), a fixed window:
 * INCR a key and EXPIRE it on the first hit. Reuses the same env vars as the
 * progress store. It fails OPEN — if Redis isn't configured, or a call errors,
 * it returns "allowed" — so the app never breaks on a Redis hiccup; the proxy's
 * exact endpoint allowlist stays the hard guarantee, this is defense-in-depth.
 */

function redisEnv(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function redisCmd(cmd: (string | number)[]): Promise<unknown> {
  const env = redisEnv();
  if (!env) return undefined;
  const res = await fetch(env.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { result?: unknown } | null;
  return json?.result;
}

export interface RateLimitResult {
  ok: boolean;
  count: number;
  limit: number;
}

/**
 * Allow up to `limit` hits per `windowSec` for `key`. Returns `{ok:false}` once
 * the window's count exceeds the limit. No-ops (allows) when Redis is absent.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (!redisEnv()) return { ok: true, count: 0, limit };
  try {
    const count = (await redisCmd(["INCR", key])) as number;
    if (count === 1) await redisCmd(["EXPIRE", key, windowSec]);
    return { ok: count <= limit, count, limit };
  } catch {
    return { ok: true, count: 0, limit }; // fail open
  }
}
