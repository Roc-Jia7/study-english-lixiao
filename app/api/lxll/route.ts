import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Server-side proxy to the lxll backend.
 *
 * Why a proxy: apiv2.lxll.com validates the request Origin against an
 * allowlist and rejects ours with `403 Invalid CORS request`. A server-side
 * fetch sends no Origin header, so it sails through. The old api.lxll.com
 * (RPC) host is CORS-open, but routing everything through one proxy keeps
 * the client uniform and avoids leaking the access token into cross-origin
 * requests. The browser talks only to this same-origin route.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOSTS = {
  rpc: "https://api.lxll.com/request",
  v2: "https://apiv2.lxll.com",
} as const;

const UA = "ct=2&v=5.0.104";

interface ProxyRequest {
  api: keyof typeof HOSTS;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string>;
}

// Exact allowlist — the ONLY endpoints this app calls. A prefix/pattern filter
// (anything under `customer/`, or any RPC method) would leave the proxy an open
// relay to the lxll backend: an anonymous caller could drive unauthenticated
// endpoints like customer/sms/code, customer/register, customer/reset-password
// (SMS spam, mass registration, password-reset abuse) or brute-force logins —
// from Vercel IPs the upstream can't easily block. Allow exactly what's used.
const ALLOWED: Record<keyof typeof HOSTS, ReadonlySet<string>> = {
  v2: new Set([
    "customer/login",
    "customer/logout",
    "customer/anti-forget/record/student",
    "customer/anti-forget/detail",
    "customer/anti-forget/progress/submit",
  ]),
  rpc: new Set(["QueryUserProfileByToken", "CustomerRetrieveStudentMetric"]),
};

/** Best-effort client IP for rate-limit keying (Vercel sets x-forwarded-for). */
function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  let spec: ProxyRequest;
  try {
    spec = (await req.json()) as ProxyRequest;
  } catch {
    return NextResponse.json({ error: "bad proxy request" }, { status: 400 });
  }

  const host = HOSTS[spec.api];
  if (!host || !ALLOWED[spec.api]?.has(spec.path)) {
    return NextResponse.json({ error: "endpoint not allowed" }, { status: 403 });
  }

  // Per-IP rate limiting (best-effort; fails open without Redis). A general cap
  // on all proxy traffic, plus a tight cap on login to blunt brute-forcing.
  const ip = clientIp(req);
  if (!(await rateLimit(`wsa:rl:lxll:${ip}`, 120, 60)).ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }
  if (spec.api === "v2" && spec.path === "customer/login") {
    if (!(await rateLimit(`wsa:rl:login:${ip}`, 8, 60)).ok) {
      return NextResponse.json({ error: "too many attempts" }, { status: 429 });
    }
  }

  const method = spec.method ?? "POST";
  let url = `${host}/${spec.path}`;
  if (spec.query && Object.keys(spec.query).length > 0) {
    url += "?" + new URLSearchParams(spec.query).toString();
  }

  // Auth: the browser forwards the stored lxll token; we attach it the way
  // each API generation expects. No Origin header is sent (server-side).
  const token = req.headers.get("x-lxll-token");
  const userId = req.headers.get("x-lxll-user");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-ua": UA,
  };
  if (token) {
    if (spec.api === "v2") headers.Authorization = `Bearer ${token}`;
    else headers["x-token-c"] = token;
  }
  if (userId) headers["x-user-id"] = userId;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(spec.body ?? {}) : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "upstream unreachable" },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  // Pass the upstream JSON (and status) straight through to the client.
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
