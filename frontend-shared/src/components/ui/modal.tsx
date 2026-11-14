"use client";

import * as React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton as MuiIconButton,
  Typography,
} from "@mui/material";
import { XIcon } from "@shared/components/ui/icons";

export type ModalSize = "sm" | "md" | "lg";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
};

function mapSize(size: ModalSize): "xs" | "sm" | "md" {
  if (size === "sm") return "xs";
  if (size === "lg") return "md";
  return "sm";
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === "backdropClick") return;
        onClose();
      }}
      fullWidth
      maxWidth={mapSize(size)}
    >
      {(title || description) && (
        <DialogTitle sx={{ pr: 6 }}>
          {title ? <span>{title}</span> : null}
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          ) : null}
          <MuiIconButton
            aria-label="Close"
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <XIcon width={20} height={20} />
          </MuiIconButton>
        </DialogTitle>
      )}

      <DialogContent dividers>{children}</DialogContent>

      {footer ? <DialogActions>{footer}</DialogActions> : null}
    </Dialog>
  );
}
