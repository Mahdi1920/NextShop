"use client";

import * as React from "react";
import { Box, Chip, Stack, TextField, Typography } from "@mui/material";
import { FILTER_PRESETS, type FilterPreset } from "@shared/lib/date-utils";

export interface DateRangeFilterProps {
  preset: FilterPreset;
  onPresetChange: (preset: FilterPreset) => void;
  selectedMonth: string;
  onSelectedMonthChange: (month: string) => void;
  customFrom: string;
  onCustomFromChange: (from: string) => void;
  customTo: string;
  onCustomToChange: (to: string) => void;
  title?: string;
}

export function DateRangeFilter({
  preset,
  onPresetChange,
  selectedMonth,
  onSelectedMonthChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
  title = "",
}: DateRangeFilterProps) {
  return (
    <Box>
      {title ? (
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          {title}
        </Typography>
      ) : null}
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {FILTER_PRESETS.map((p) => (
          <Chip
            key={p.value}
            label={p.label}
            onClick={() => onPresetChange(p.value)}
            color={preset === p.value ? "primary" : "default"}
            variant={preset === p.value ? "filled" : "outlined"}
            sx={{ cursor: "pointer", fontWeight: 600 }}
          />
        ))}
      </Stack>

      {preset === "choose_month" && (
        <Box sx={{ mt: 2, maxWidth: 220 }}>
          <TextField
            label="Select Month"
            type="month"
            size="small"
            value={selectedMonth}
            onChange={(e: any) => onSelectedMonthChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Box>
      )}

      {preset === "custom" && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2, maxWidth: 480 }}>
          <TextField
            label="From"
            type="date"
            size="small"
            value={customFrom}
            onChange={(e: any) => onCustomFromChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={customTo}
            onChange={(e: any) => onCustomToChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Stack>
      )}
    </Box>
  );
}
