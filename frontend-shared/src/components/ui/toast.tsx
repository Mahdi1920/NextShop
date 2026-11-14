"use client";

import * as React from "react";
import { Alert, AlertTitle, Snackbar } from "@mui/material";

export type ToastVariant = "default" | "success" | "warning" | "danger";

export type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  notify: (toast: Omit<ToastItem, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function mapVariantToSeverity(variant: ToastVariant): "info" | "success" | "warning" | "error" {
  switch (variant) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "danger":
      return "error";
    case "default":
    default:
      return "info";
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = React.useState<ToastItem[]>([]);
  const [open, setOpen] = React.useState(false);
  const [dismissedId, setDismissedId] = React.useState<string | null>(null);

  const current = queue[0];

  const notify = React.useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const item: ToastItem = {
      id,
      durationMs: 3500,
      variant: "default",
      ...toast,
    };
    setQueue((prev) => [...prev, item]);
  }, []);

  React.useEffect(() => {
    if (!current) {
      if (dismissedId) setDismissedId(null);
      return;
    }
    // If the user just closed this exact toast, let it finish closing and be dequeued.
    if (!open && current.id !== dismissedId) setOpen(true);
  }, [current, open, dismissedId]);

  const handleClose = (_?: unknown, reason?: string) => {
    if (reason === "clickaway") return;
    if (current?.id) setDismissedId(current.id);
    setOpen(false);
  };

  const handleExited = () => {
    setQueue((prev) => prev.slice(1));
  };

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <Snackbar
        open={Boolean(current) && open}
        autoHideDuration={current?.durationMs ?? 3500}
        onClose={handleClose}
        TransitionProps={{ onExited: handleExited }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleClose}
          severity={mapVariantToSeverity(current?.variant ?? "default")}
          sx={{ width: "100%" }}
        >
          {current?.title ? <AlertTitle>{current.title}</AlertTitle> : null}
          {current?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
