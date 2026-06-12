import { NextRequest, NextResponse } from "next/server";

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

// Only forward to known endpoint families — not an open relay.
function isAllowedPath(api: keyof typeof HOSTS, path: string): boolean {
  if (path.includes("..")) return false;
  if (api === "v2") return path.startsWith("customer/");
  // rpc: PascalCase method names only
  return /^[A-Za-z][A-Za-z0-9]*$/.test(path);
}

export async function POST(req: NextRequest) {
  let spec: ProxyRequest;
  try {
    spec = (await req.json()) as ProxyRequest;
  } catch {
    return NextResponse.json({ error: "bad proxy request" }, { status: 400 });
  }

  const host = HOSTS[spec.api];
  if (!host || !isAllowedPath(spec.api, spec.path)) {
    return NextResponse.json({ error: "endpoint not allowed" }, { status: 403 });
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
