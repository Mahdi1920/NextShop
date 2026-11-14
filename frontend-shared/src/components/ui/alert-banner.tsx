"use client";

import * as React from "react";
import { Alert, AlertTitle, type SxProps, type Theme } from "@mui/material";

export type AlertBannerProps = {
  severity?: "info" | "success" | "warning" | "error";
  title?: React.ReactNode;
  children?: String | React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
  dismissible?: boolean;
  autoHideMs?: number | null;
  sx?: SxProps<Theme>;
  defaultOpen?: boolean;
};

export function AlertBanner({
  severity = "info",
  title,
  children,
  action,
  onClose,
  dismissible = true,
  autoHideMs = 5000,
  sx,
  defaultOpen = true,
}: AlertBannerProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    if (!open || autoHideMs === null) return;

    const timeoutId = window.setTimeout(() => {
      setOpen(false);
      onClose?.();
    }, autoHideMs);

    return () => window.clearTimeout(timeoutId);
  }, [autoHideMs, onClose, open]);

  if (!open) return null;

  return (
    <Alert
      severity={severity}
      sx={sx}
      action={action}
      onClose={
        dismissible
          ? () => {
              setOpen(false);
              onClose?.();
            }
          : undefined
      }
    >
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {children}
    </Alert>
  );
}
