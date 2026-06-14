import { NextRequest, NextResponse } from "next/server";

/**
 * Cross-device game-progress store (pet name, XP, streak, per-word progress)
 * keyed by the child's lxll userId. Backed by Upstash Redis (free tier) via
 * its REST API. Auth: we never trust a client-claimed id — the token is
 * verified server-side against lxll, and only the verified userId is used as
 * the key. If Redis isn't configured the routes no-op so the app stays
 * purely local.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LXLL_RPC_HOST = "https://api.lxll.com/request";
const UA = "ct=2&v=5.0.104";
const KEY_PREFIX = "wsa:state:v1:";

function redisEnv(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

/** Run one Redis command via the Upstash REST API. */
async function redis(cmd: unknown[]): Promise<unknown> {
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

/** Confirm the bearer token really belongs to the claimed userId (via lxll). */
async function verifyUserId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get("x-lxll-token");
  const claimed = req.headers.get("x-lxll-user");
  if (!token) return null;
  try {
    const res = await fetch(`${LXLL_RPC_HOST}/QueryUserProfileByToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-token-c": token,
        "x-ua": UA,
        ...(claimed ? { "x-user-id": claimed } : {}),
      },
      body: "{}",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { success?: boolean; data?: { userId?: string } }
      | null;
    const uid = data?.data?.userId;
    if (typeof uid !== "string") return null;
    // If the client claimed an id, it must match the verified one.
    if (claimed && claimed !== uid) return null;
    return uid;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!redisEnv()) return NextResponse.json({ disabled: true });
  const userId = await verifyUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await redis(["GET", KEY_PREFIX + userId]);
  let state: unknown = null;
  if (typeof raw === "string") {
    try {
      state = JSON.parse(raw);
    } catch {
      state = null;
    }
  }
  return NextResponse.json({ state });
}

export async function PUT(req: NextRequest) {
  if (!redisEnv()) return NextResponse.json({ disabled: true });
  const userId = await verifyUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { state?: unknown };
  try {
    body = (await req.json()) as { state?: unknown };
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (body.state == null) {
    return NextResponse.json({ error: "missing state" }, { status: 400 });
  }

  await redis(["SET", KEY_PREFIX + userId, JSON.stringify(body.state)]);
  return NextResponse.json({ ok: true });
}
