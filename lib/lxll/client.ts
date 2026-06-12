/**
 * Browser-side client for the lxll backend. All calls go through our
 * same-origin proxy at /api/lxll (see app/api/lxll/route.ts) — apiv2 blocks
 * cross-origin browsers, and the proxy also keeps the transport uniform.
 *
 * Two API generations, two response envelopes, one success contract:
 *   old RPC  (api.lxll.com/request/*): { success: true, data } | { success:false, errorCode, errorMessage }
 *   new REST (apiv2.lxll.com/*):       { code: "0", msg, data }  | { code: "<n>", msg }
 */

const PROXY_URL = "/api/lxll";

const TOKEN_KEY = "lxll:accessToken";
const REFRESH_KEY = "lxll:refreshToken";
const USER_ID_KEY = "lxll:userId";

export interface LxllSession {
  accessToken: string;
  refreshToken?: string;
  userId?: string;
}

export class LxllApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LxllApiError";
  }
}

// ── Session persistence ───────────────────────────────────────────────
export function loadSession(): LxllSession | null {
  if (typeof window === "undefined") return null;
  const accessToken = localStorage.getItem(TOKEN_KEY);
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: localStorage.getItem(REFRESH_KEY) ?? undefined,
    userId: localStorage.getItem(USER_ID_KEY) ?? undefined,
  };
}

export function saveSession(session: LxllSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  if (session.refreshToken) localStorage.setItem(REFRESH_KEY, session.refreshToken);
  if (session.userId) localStorage.setItem(USER_ID_KEY, session.userId);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  [TOKEN_KEY, REFRESH_KEY, USER_ID_KEY].forEach((k) => localStorage.removeItem(k));
}

// ── Core request through the proxy ────────────────────────────────────
interface CallSpec {
  api: "rpc" | "v2";
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string>;
  /** Don't attach the stored token (login / public calls). */
  isPublic?: boolean;
}

interface RpcEnvelope<T> {
  success?: boolean;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
}
interface V2Envelope<T> {
  code?: string;
  msg?: string;
  data?: T;
}

async function call<T>(spec: CallSpec): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!spec.isPublic) {
    const session = loadSession();
    if (session?.accessToken) headers["x-lxll-token"] = session.accessToken;
    if (session?.userId) headers["x-lxll-user"] = session.userId;
  }

  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      api: spec.api,
      path: spec.path,
      method: spec.method ?? "POST",
      body: spec.body,
      query: spec.query,
    }),
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON */
  }

  if (spec.api === "v2") {
    const env = payload as V2Envelope<T> | null;
    if (!res.ok || (env?.code != null && env.code !== "0")) {
      throw new LxllApiError(env?.msg || `请求失败 (HTTP ${res.status})`, env?.code, res.status);
    }
    return env?.data as T;
  }

  const env = payload as RpcEnvelope<T> | null;
  if (!res.ok || env?.success === false) {
    throw new LxllApiError(
      env?.errorMessage || `请求失败 (HTTP ${res.status})`,
      env?.errorCode,
      res.status,
    );
  }
  return env?.data as T;
}

/** Old RPC endpoint: POST api.lxll.com/request/<Endpoint>. */
export function rpc<T>(
  endpoint: string,
  body?: unknown,
  isPublic = false,
): Promise<T> {
  return call<T>({ api: "rpc", path: endpoint, body, isPublic });
}

/** New REST endpoint on apiv2: POST/GET apiv2.lxll.com/<path>. */
export function v2<T>(
  path: string,
  opts: { method?: "GET" | "POST"; body?: unknown; query?: Record<string, string>; isPublic?: boolean } = {},
): Promise<T> {
  return call<T>({ api: "v2", path, ...opts });
}
