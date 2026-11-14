"use client";

import * as React from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "@shared/theme/theme";
import { SessionProvider } from "@shared/context/session-context";
import { LocaleProvider } from "@shared/context/locale-context";
import { ToastProvider } from "@shared/components/ui/toast";
import { ConfirmProvider } from "@shared/components/ui/confirm-provider";
import { AppShell } from "@shared/components/layout/AppShell";
import { SocketProvider } from "@shared/context/socket-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SessionProvider>
        <LocaleProvider>
          <ToastProvider>
            <ConfirmProvider>
              <SocketProvider>
                <AppShell>{children}</AppShell>
              </SocketProvider>
            </ConfirmProvider>
          </ToastProvider>
        </LocaleProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
