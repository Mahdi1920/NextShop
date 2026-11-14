"use client";

import * as React from "react";

export function useDisclosure(initialOpen = false) {
  const [open, setOpen] = React.useState(initialOpen);

  const onOpen = React.useCallback(() => setOpen(true), []);
  const onClose = React.useCallback(() => setOpen(false), []);
  const onToggle = React.useCallback(() => setOpen((v) => !v), []);

  return { open, setOpen, onOpen, onClose, onToggle };
}
