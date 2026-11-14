"use client";
import { FormField } from "@shared/components/ui/form-field";

import * as React from "react";
import { Box, Stack, TextField, Typography } from "@mui/material";

export type TableToolbarProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  className?: string;
};

export function TableToolbar({
  title,
  subtitle,
  actions,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Searchâ€¦",
}: TableToolbarProps) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-end" }} justifyContent="space-between">
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }} noWrap>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
        {onSearchChange ? (
          <FormField
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            size="small"
          />
        ) : null}
        {actions}
      </Stack>
    </Stack>
  );
}
