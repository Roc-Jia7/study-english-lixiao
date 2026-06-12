/**
 * Authentication against the lxll backend.
 *
 * The request side (endpoint, params, headers, envelope) is confirmed from
 * the official client. The *response* fields below are a best-effort
 * inference and marked PROVISIONAL — they need to be reconciled against one
 * real login response before being trusted. See lib/lxll/README.md.
 */

import { LXLL_RPC } from "./endpoints";
import {
  clearSession,
  rpc,
  saveSession,
  type LxllSession,
} from "./client";

/** PROVISIONAL: confirm exact field names against a real response. */
export interface LxllUserProfile {
  userId: string;
  name?: string;
  nickName?: string;
  avatar?: string;
  phone?: string;
  /** Role discriminator seen in the client: "USER" (student) vs "TEACHER". */
  userType?: "USER" | "TEACHER" | string;
  [extra: string]: unknown;
}

/** PROVISIONAL login result shape. */
interface LoginResponse {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  userId?: string;
  userInfo?: LxllUserProfile;
  [extra: string]: unknown;
}

function toSession(res: LoginResponse): LxllSession {
  const accessToken = res.accessToken ?? res.token ?? "";
  if (!accessToken) {
    throw new Error("登录响应缺少 token 字段，请核对真实响应结构");
  }
  return {
    accessToken,
    refreshToken: res.refreshToken,
    userId: res.userId ?? res.userInfo?.userId,
  };
}

/**
 * Password login. Verified working against the live endpoint: a bad account
 * returns HTTP 400 `USER_NOT_EXISTED`, confirming the {phone,password} body
 * is parsed correctly.
 */
export async function loginByPassword(
  phone: string,
  password: string,
): Promise<{ session: LxllSession; raw: LoginResponse }> {
  const raw = await rpc<LoginResponse>(
    LXLL_RPC.loginByPhoneAndPassword,
    { phone, password },
    { isPublic: true },
  );
  const session = toSession(raw);
  saveSession(session);
  return { session, raw };
}

/** Request an SMS login code. */
export async function requestSmsCode(phone: string): Promise<void> {
  await rpc(LXLL_RPC.applyLoginPhoneCode, { phone }, { isPublic: true });
}

/** SMS-code login. */
export async function loginByCode(
  phone: string,
  code: string,
): Promise<{ session: LxllSession; raw: LoginResponse }> {
  const raw = await rpc<LoginResponse>(
    LXLL_RPC.loginByPhoneCode,
    { phone, code },
    { isPublic: true },
  );
  const session = toSession(raw);
  saveSession(session);
  return { session, raw };
}

/** Fetch the logged-in user's profile (also validates the stored token). */
export function fetchUserProfile(): Promise<LxllUserProfile> {
  return rpc<LxllUserProfile>(LXLL_RPC.queryUserProfileByToken);
}

export async function logout(): Promise<void> {
  try {
    await rpc(LXLL_RPC.logout);
  } finally {
    clearSession();
  }
}
