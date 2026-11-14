"use client";

import * as React from "react";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";

import { Button, type ButtonProps } from "@shared/components/ui/button";

export type LikeButtonProps = {
  liked: boolean;
  count?: number;
  onToggle: () => void | Promise<void>;
  isLoading?: boolean;
  label?: string;
} & Pick<ButtonProps, "size" | "disabled">;

export function LikeButton({
  liked,
  count,
  onToggle,
  isLoading,
  disabled,
  size,
  label = "Like",
}: LikeButtonProps) {
  const text = typeof count === "number" ? `${label} (${count})` : label;

  return (
    <Button
      size={size}
      variant={liked ? "secondary" : "primary"}
      isLoading={isLoading}
      disabled={disabled}
      leftIcon={liked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
      onClick={onToggle}
      aria-pressed={liked}
    >
      {text}
    </Button>
  );
}
