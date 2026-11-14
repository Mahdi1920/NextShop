"use client";

import * as React from "react";
import type { User, UserRole } from "@shared/api/users";
import { getCurrentUser, getCurrentRole, getValidAccessToken, getAccessToken, logout, setSession, recordActivity, isSessionInactive } from "@shared/lib/auth-storage";
import { apiClient } from "@shared/api/clients";

export type SessionState = {
  accessToken: string | null;
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isReady: boolean;
};

export type SessionActions = {
  refresh: () => void;
  login: (accessToken: string, user: User | null) => void;
  logout: (reason?: "logout" | "session") => void;
};

export type SessionContextValue = SessionState & SessionActions;

const SessionContext = React.createContext<SessionContextValue | null>(null);

const emptySession: SessionState = {
  accessToken: null,
  user: null,
  role: null,
  isAuthenticated: false,
  isReady: false,
};

function readSession(): SessionState {
  const accessToken = getValidAccessToken();
  const user = getCurrentUser();
  const role = getCurrentRole();
  return {
    accessToken,
    user,
    role,
    isAuthenticated: Boolean(accessToken),
    isReady: false,
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Keep the server render and the first client render identical. localStorage
  // is read only after hydration in the effect below.
  const [state, setState] = React.useState<SessionState>(emptySession);

  const refresh = React.useCallback(() => {
    setState({ ...readSession(), isReady: true });
  }, []);

  const login = React.useCallback((accessToken: string, user: User | null) => {
    setSession(accessToken, user);
    setState(readSession());
  }, []);

  const logoutAction = React.useCallback((reason: "logout" | "session" = "logout") => {
    logout(reason);
  }, []);

  // ── 30-Minute Inactivity Auto-Logout ("sans actions") ──────────────────────
  React.useEffect(() => {
    if (!state.isAuthenticated) return;

    let lastRecorded = 0;
    const handleUserAction = () => {
      const now = Date.now();
      // Throttle recording to at most once every 2 seconds
      if (now - lastRecorded >= 2000) {
        lastRecorded = now;
        recordActivity();
      }
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    for (const evt of events) {
      window.addEventListener(evt, handleUserAction, { passive: true });
    }

    // Check inactivity every 10 seconds
    const intervalId = window.setInterval(() => {
      if (isSessionInactive()) {
        logoutAction("session");
      }
    }, 10_000);

    return () => {
      for (const evt of events) {
        window.removeEventListener(evt, handleUserAction);
      }
      window.clearInterval(intervalId);
    };
  }, [state.isAuthenticated, logoutAction]);

  // ── Auto-refresh token for active sessions every 15 minutes ─────────────────
  React.useEffect(() => {
    if (!state.isAuthenticated) return;

    const refreshInterval = window.setInterval(async () => {
      if (!isSessionInactive()) {
        try {
          const res = await apiClient.post<{ accessToken: string }>("/auth/refresh");
          if (res.data?.accessToken) {
            setSession(res.data.accessToken, getCurrentUser());
            setState(readSession());
          }
        } catch {
          // Token expiration naturally handled by 401 interceptor
        }
      }
    }, 15 * 60 * 1000);

    return () => window.clearInterval(refreshInterval);
  }, [state.isAuthenticated]);


  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    // Keep state in sync across tabs/windows.
    function onStorage(e: StorageEvent) {
      if (e.key === "accessToken" || e.key === "currentUser") {
        refresh();
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  React.useEffect(() => {
    // Periodically re-check token expiry while the app is open.
    const id = window.setInterval(() => {
      refresh();
    }, 30_000);

    function onFocus() {
      if (getAccessToken() && isSessionInactive()) {
        logoutAction("session");
        return;
      }
      refresh();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        if (getAccessToken() && isSessionInactive()) {
          logoutAction("session");
          return;
        }
        refresh();
      }
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  const value: SessionContextValue = React.useMemo(
    () => ({
      ...state,
      refresh,
      login,
      logout: logoutAction,
    }),
    [state, refresh, login, logoutAction],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within <SessionProvider>");
  }
  return ctx;
}
