"use client";

import * as React from "react";
import { Button as MuiButton, CircularProgress, IconButton as MuiIconButton } from "@mui/material";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "contained" | "outlined" | "text";
export type ButtonSize = "sm" | "md" | "lg" | "small" | "medium" | "large";
type MuiButtonColor = React.ComponentProps<typeof MuiButton>["color"];

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: MuiButtonColor;
  component?: React.ElementType;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
} & Omit<React.ComponentProps<typeof MuiButton>, "variant" | "color" | "size" | "startIcon" | "endIcon">;

function mapSize(size: ButtonSize): "small" | "medium" | "large" {
  if (size === "sm" || size === "small") return "small";
  if (size === "lg" || size === "large") return "large";
  return "medium";
}

function mapVariant(variant: ButtonVariant): { muiVariant: "contained" | "outlined" | "text"; color: MuiButtonColor } {
  switch (variant) {
    case "outlined": return { muiVariant: "outlined", color: "primary" };
    case "text": return { muiVariant: "text", color: "primary" };
    case "contained": return { muiVariant: "contained", color: "primary" };
    case "secondary": return { muiVariant: "outlined", color: "secondary" };
    case "danger": return { muiVariant: "contained", color: "error" };
    case "ghost": return { muiVariant: "text", color: "secondary" };
    default: return { muiVariant: "contained", color: "primary" };
  }
}

export function Button({
  variant = "primary", size = "md", color: providedColor, isLoading, leftIcon, rightIcon,
  disabled, children, ...props
}: ButtonProps) {
  const { muiVariant, color } = mapVariant(variant);
  return (
    <MuiButton
      variant={muiVariant}
      color={providedColor ?? color}
      size={mapSize(size)}
      disabled={disabled || isLoading}
      startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : leftIcon}
      endIcon={rightIcon}
      {...props}
    >
      {children}
    </MuiButton>
  );
}

export type IconButtonProps = {
  "aria-label": string;
  icon: React.ReactNode;
  variant?: "default" | "danger";
} & Omit<React.ComponentProps<typeof MuiIconButton>, "color">;

export function IconButton({ icon, variant = "default", ...props }: IconButtonProps) {
  return <MuiIconButton color={variant === "danger" ? "error" : "default"} {...props}>{icon}</MuiIconButton>;
}
