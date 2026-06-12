/**
 * Authentication against the lxll backend. Login is the apiv2 REST endpoint
 * `customer/login`; the profile comes from the old RPC
 * `QueryUserProfileByToken`. Both confirmed against real responses.
 */

import { LXLL_RPC } from "./endpoints";
import { rpc, v2, saveSession, clearSession, type LxllSession } from "./client";
import type { LxllLoginData, LxllLoginType, LxllUserProfile } from "./types";

/** Account numbers look like "XP06153004"; phones are 11 digits. */
function isAccountNo(id: string): boolean {
  return !/^\d{11}$/.test(id.trim());
}

/**
 * Phone- or account-number login with password. The backend returns one or
 * more accounts (a parent can hold several children); we sign in as the
 * first by default and keep the rest available on the session.
 */
export async function loginByPassword(
  identifier: string,
  password: string,
): Promise<{ session: LxllSession; data: LxllLoginData }> {
  const id = identifier.trim();
  const byAccount = isAccountNo(id);
  const loginType: LxllLoginType = byAccount
    ? "ACCOUNT_PASSWORD"
    : "PHONE_PASSWORD";

  const body = byAccount
    ? { loginType, inviteUserId: "", accountNo: id, password }
    : { loginType, inviteUserId: "", phone: id, password };

  const data = await v2<LxllLoginData>("customer/login", {
    method: "POST",
    body,
    isPublic: true,
  });

  const account = data?.accounts?.[0];
  if (!account?.accessToken) {
    throw new Error("登录成功但未返回账号，请确认该手机号下有学员");
  }

  const session: LxllSession = {
    accessToken: account.accessToken,
    refreshToken: data.refreshToken,
    userId: account.userId,
  };
  saveSession(session);
  return { session, data };
}

/** Fetch the signed-in user's profile (also validates the stored token). */
export function fetchUserProfile(): Promise<LxllUserProfile> {
  return rpc<LxllUserProfile>(LXLL_RPC.queryUserProfileByToken);
}

export async function logout(): Promise<void> {
  try {
    await v2("customer/logout", { method: "POST" });
  } catch {
    /* best-effort */
  } finally {
    clearSession();
  }
}
