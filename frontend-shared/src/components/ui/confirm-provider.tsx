"use client";

import * as React from "react";
import { ConfirmDialog, type ConfirmDialogProps } from "@shared/components/ui/confirm-dialog";

export type ConfirmOptions = Omit<ConfirmDialogProps, "open" | "onCancel" | "onConfirm" | "isLoading"> & {
  /** If true, the dialog won't close until you call the returned `resolve`. */
  keepOpenWhile?: "manual";
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolveRef = React.useRef<((v: boolean) => void) | null>(null);

  const confirm = React.useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = React.useCallback(() => {
    setOpen(false);
    setOptions(null);
    resolveRef.current = null;
  }, []);

  const onCancel = React.useCallback(() => {
    resolveRef.current?.(false);
    close();
  }, [close]);

  const onConfirm = React.useCallback(() => {
    resolveRef.current?.(true);
    close();
  }, [close]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        open={open}
        title={options?.title}
        message={options?.message}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        isDanger={options?.isDanger}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx.confirm;
}
