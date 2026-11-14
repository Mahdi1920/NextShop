import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

export type ApiError = { status: number; message: string; details?: unknown };

export class ApiFetchError extends Error {
  public status: number;
  public details?: unknown;

  constructor(err: ApiError) {
    super(err.message);
    this.name = "ApiFetchError";
    this.status = err.status;
    this.details = err.details;
  }
}

function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:3001";
  const base = raw.replace(/\/+$/, "");
  if (/\/api\/v\d+$/.test(base)) return base;
  if (base.endsWith("/api")) return `${base}/v1`;
  return `${base}/api/v1`;
}

function getValidAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = window.localStorage.getItem("accessToken");
    if (!token) return null;
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return token;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    const payload = JSON.parse(window.atob(padded)) as { exp?: unknown };
    if (typeof payload.exp === "number" && Date.now() >= payload.exp * 1000 - 10_000) {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("currentUser");
      return null;
    }
    return token;
  } catch {
    try {
      return window.localStorage.getItem("accessToken");
    } catch {
      return null;
    }
  }
}

function expireSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("accessToken");
  window.localStorage.removeItem("currentUser");
  const url = new URL("/auth/sign-in", window.location.origin);
  url.searchParams.set("reason", "session");
  window.location.assign(url.toString());
}

function normalizeErrorMessage(details: unknown, fallback: string): string {
  if (!details || typeof details !== "object") return fallback;
  const payload = details as Record<string, unknown>;
  const error = payload["error"];
  const message = payload["message"] ?? (typeof error === "object" && error
    ? (error as Record<string, unknown>)["message"]
    : error);
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message)) {
    const messages = message.filter((item): item is string => typeof item === "string" && !!item.trim());
    if (messages.length) return messages.join("; ");
  }
  return fallback;
}

export const apiClient: AxiosInstance = axios.create({ baseURL: getApiBaseUrl() });

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getValidAccessToken();
  if (token) {
    if (!config.headers.get("Authorization")) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const status = error.response?.status ?? 0;
    if (status === 401) expireSession();
    const details = error.response?.data;
    const message = normalizeErrorMessage(details, error.message || "Request failed");
    return Promise.reject(new ApiFetchError({ status, message, details }));
  },
);
