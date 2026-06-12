/**
 * Transport layer for the "李校来啦" (lxll) backend.
 *
 * Reverse-engineered from the official H5 client bundle
 * (https://h5.lxll.com). Confirmed facts this module relies on:
 *
 *   - Two API generations share one auth scheme:
 *       old (RPC):  POST https://api.lxll.com/request/<Endpoint>
 *       new (REST): POST https://apiv2.lxll.com/<path>
 *   - Auth: a JWT access token. Old API sends it as `x-token-c: <jwt>`,
 *     new API as `Authorization: Bearer <jwt>`. Plus `x-user-id` and
 *     `x-ua: ct=2&v=5.0.104`. No request signing/HMAC.
 *   - Envelope: success → `{ success: true, data }`;
 *     failure → HTTP 400 `{ success:false, errorCode, errorMessage, errorLevel }`.
 *   - CORS is open to arbitrary origins (verified against our Vercel host),
 *     so the browser may call the API directly — no proxy required.
 *
 * Response *data* shapes are NOT in the client bundle (they come from the
 * server), so the typed wrappers in ./api.ts mark their payloads provisional
 * until verified against a real authenticated response.
 */

export const LXLL_API_BASE = "https://api.lxll.com/request";
export const LXLL_APIV2_BASE = "https://apiv2.lxll.com";
const UA = "ct=2&v=5.0.104";

/** localStorage keys, matching the official client so a token stays portable. */
const TOKEN_KEY = "lxll:x-course-learn";
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
    readonly errorCode?: string,
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

// ── JWT helpers (token is a standard JWT; we only read `exp`) ──────────
function decodeJwtExp(jwt: string): number | null {
  try {
    const payload = jwt.split(".")[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

/** True when the token is missing or expires within `skewSeconds`. */
export function isTokenStale(jwt: string, skewSeconds = 300): boolean {
  const exp = decodeJwtExp(jwt);
  if (exp === null) return false; // unknown shape — don't force a refresh loop
  return exp - Math.floor(Date.now() / 1000) < skewSeconds;
}

// ── Core request ──────────────────────────────────────────────────────
interface RequestOptions {
  /** Skip attaching the auth token (for login / public endpoints). */
  isPublic?: boolean;
  /** Use the apiv2 REST base + Bearer auth instead of the RPC base. */
  isNewApi?: boolean;
}

async function request<T>(
  url: string,
  body: unknown,
  { isPublic = false, isNewApi = false }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-ua": UA,
  };

  if (!isPublic) {
    const session = loadSession();
    if (session?.accessToken) {
      if (isNewApi) headers.Authorization = `Bearer ${session.accessToken}`;
      else headers["x-token-c"] = session.accessToken;
    }
    if (session?.userId) headers["x-user-id"] = session.userId;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON error body */
  }

  const env = payload as
    | { success?: boolean; data?: T; errorCode?: string; errorMessage?: string }
    | null;

  if (!res.ok || env?.success === false) {
    throw new LxllApiError(
      env?.errorMessage || `请求失败 (HTTP ${res.status})`,
      env?.errorCode,
      res.status,
    );
  }

  // Unwrap the {success,data} envelope when present; some endpoints return raw.
  return (env && "data" in env ? (env.data as T) : (payload as T)) ?? (env as T);
}

/** Call an old-style RPC endpoint: POST api.lxll.com/request/<Endpoint>. */
export function rpc<T>(
  endpoint: string,
  params?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  return request<T>(`${LXLL_API_BASE}/${endpoint}`, params, opts);
}

/** Call a new-style REST endpoint: POST apiv2.lxll.com/<path>. */
export function restV2<T>(
  path: string,
  params?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  return request<T>(`${LXLL_APIV2_BASE}/${path}`, params, {
    ...opts,
    isNewApi: true,
  });
}
