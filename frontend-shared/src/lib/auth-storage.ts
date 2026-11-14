import type { User, UserRole } from "@shared/api/users";

const TOKEN_KEY = "accessToken";
const USER_KEY = "currentUser";
const LAST_ACTIVITY_KEY = "lastActivity";
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes sans actions

export function recordActivity(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {}
}

export function getLastActivity(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const val = window.localStorage.getItem(LAST_ACTIVITY_KEY);
    return val ? Number(val) : Date.now();
  } catch {
    return Date.now();
  }
}

export function isSessionInactive(): boolean {
  if (typeof window === "undefined") return false;
  const token = getAccessToken();
  if (!token) return false;
  const lastActive = getLastActivity();
  return Date.now() - lastActive >= INACTIVITY_TIMEOUT_MS;
}

type JwtPayload = {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

function base64UrlToString(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
}

function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = base64UrlToString(parts[1]);
    const payload = JSON.parse(json) as unknown;
    if (!payload || typeof payload !== "object") return null;
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

function isExpiredToken(token: string, skewSeconds = 10): boolean {
  const payload = parseJwtPayload(token);
  const exp = payload?.exp;
  if (!exp || typeof exp !== "number") return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds >= exp - skewSeconds;
}

export function setSession(accessToken: string, user: User | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getValidAccessToken(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  if (isExpiredToken(token) || isSessionInactive()) {
    clearSession();
    return null;
  }
  return token;
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as User;
  } catch {
    return null;
  }
}

export function getCurrentRole(): UserRole | null {
  const user = getCurrentUser();
  return (user?.role as UserRole | undefined) ?? null;
}

export function logout(reason: "logout" | "session" = "logout") {
  clearSession();
  if (typeof window === "undefined") return;
  const url = new URL("/auth/sign-in", window.location.origin);
  url.searchParams.set("reason", reason);
  window.location.assign(url.toString());
}
