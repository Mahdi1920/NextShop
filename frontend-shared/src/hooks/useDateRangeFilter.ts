"use client";

import * as React from "react";
import {
  computeDateRange,
  toBusinessDateStr,
  type FilterPreset,
} from "@shared/lib/date-utils";

export function useDateRangeFilter(initialPreset: FilterPreset = "today") {
  const [preset, setPreset] = React.useState<FilterPreset>(initialPreset);
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
    return toBusinessDateStr(new Date()).slice(0, 7);
  });
  const [customFrom, setCustomFrom] = React.useState<string>(() => toBusinessDateStr(new Date()));
  const [customTo, setCustomTo] = React.useState<string>(() => toBusinessDateStr(new Date()));

  const activeRange = React.useMemo(
    () => computeDateRange(preset, selectedMonth, customFrom, customTo),
    [preset, selectedMonth, customFrom, customTo],
  );

  return {
    preset,
    setPreset,
    selectedMonth,
    setSelectedMonth,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    activeRange,
  };
}

export type DateRangeFilterState = ReturnType<typeof useDateRangeFilter>;

export function toDateRangeFilterProps(filter: DateRangeFilterState) {
  return {
    preset: filter.preset,
    onPresetChange: filter.setPreset,
    selectedMonth: filter.selectedMonth,
    onSelectedMonthChange: filter.setSelectedMonth,
    customFrom: filter.customFrom,
    onCustomFromChange: filter.setCustomFrom,
    customTo: filter.customTo,
    onCustomToChange: filter.setCustomTo,
  };
}
