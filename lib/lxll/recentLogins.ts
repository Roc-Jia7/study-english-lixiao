/**
 * Remembers who has signed in on THIS device — the identifier (phone or
 * account number) and the child's name/avatar — so switching child is just
 * "tap the child, type their password". Passwords are NEVER stored.
 */

export interface RecentLogin {
  userId: string;
  /** The phone or account number used to sign in (no password). */
  identifier: string;
  name: string;
  avatar: string;
}

const LIST_KEY = "lxll:recentLogins";
const LAST_KEY = "lxll:lastIdentifier";
const MAX = 4;

function isRecent(x: unknown): x is RecentLogin {
  const r = x as RecentLogin;
  return (
    !!r &&
    typeof r.userId === "string" &&
    typeof r.identifier === "string" &&
    typeof r.name === "string" &&
    typeof r.avatar === "string"
  );
}

export function loadRecentLogins(): RecentLogin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(isRecent) : [];
  } catch {
    return [];
  }
}

/** The identifier used most recently — pre-fills the login box. */
export function loadLastIdentifier(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LAST_KEY) ?? "";
}

/** Record a successful sign-in (most-recent first, capped, deduped by user). */
export function rememberLogin(login: RecentLogin) {
  if (typeof window === "undefined") return;
  const list = [login, ...loadRecentLogins().filter((l) => l.userId !== login.userId)];
  localStorage.setItem(LIST_KEY, JSON.stringify(list.slice(0, MAX)));
  localStorage.setItem(LAST_KEY, login.identifier);
}

/** Drop one remembered child (e.g. on a shared device). */
export function forgetRecentLogin(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    LIST_KEY,
    JSON.stringify(loadRecentLogins().filter((l) => l.userId !== userId)),
  );
}
