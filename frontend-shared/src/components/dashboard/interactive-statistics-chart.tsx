"use client";

import * as React from "react";
import { Box, Card, CardContent, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useTranslations } from "@shared/context/locale-context";

export type StatisticsChartSeries<T extends object = Record<string, number | string>> = {
  key: string;
  label: string;
  color: string;
  value: (point: T) => number;
  format?: (value: number) => string;
};

type Props<T extends { date: string }> = {
  title: string;
  data: T[];
  series: StatisticsChartSeries<T>[];
  emptyMessage?: string;
  defaultChartType?: "line" | "bar";
  formatDate?: (date: string) => string;
};

const chartWidth = 760;
const chartHeight = 260;
const padding = { top: 20, right: 18, bottom: 42, left: 48 };

export function InteractiveStatisticsChart<T extends { date: string }>({ title, data, series, emptyMessage = "No statistics for this period.", defaultChartType = "line", formatDate }: Props<T>) {
  const t = useTranslations();
  const [activeKeys, setActiveKeys] = React.useState<string[]>(series.slice(0, 2).map((item) => item.key));
  const [chartType, setChartType] = React.useState<"line" | "bar">(defaultChartType);
  const [hovered, setHovered] = React.useState<number | null>(null);
  const activeSeries = series.filter((item) => activeKeys.includes(item.key));
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...data.flatMap((point) => activeSeries.map((item) => item.value(point))));
  const x = (index: number) => padding.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const y = (value: number) => padding.top + plotHeight - (value / maxValue) * plotHeight;
  const label = (point: T) => formatDate?.(point.date) ?? point.date;

  React.useEffect(() => {
    setActiveKeys((current) => {
      const valid = current.filter((key) => series.some((item) => item.key === key));
      const next = valid.length ? valid : series.slice(0, 2).map((item) => item.key);
      return next.length === current.length && next.every((key, index) => key === current[index]) ? current : next;
    });
  }, [series]);

  const currentPoint = hovered === null ? undefined : data[hovered];
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" gap={1.5} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>{title}</Typography>
            <Typography variant="caption" color="text.secondary">{t("DASHBOARD_CHART.HOVER_HELP")}</Typography>
          </Box>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <ToggleButtonGroup size="small" value={activeKeys} onChange={(_, value: string[]) => { if (value.length) setActiveKeys(value); }} aria-label={t("DASHBOARD_CHART.METRICS")}>
              {series.map((item) => <ToggleButton key={item.key} value={item.key} sx={{ textTransform: "none" }}>{item.label}</ToggleButton>)}
            </ToggleButtonGroup>
            <ToggleButtonGroup exclusive size="small" value={chartType} onChange={(_, value) => { if (value) setChartType(value); }} aria-label={t("DASHBOARD_CHART.STYLE")}>
              <ToggleButton value="line">{t("DASHBOARD_CHART.LINE")}</ToggleButton>
              <ToggleButton value="bar">{t("DASHBOARD_CHART.BARS")}</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
        {data.length === 0 || activeSeries.length === 0 ? (
          <Box sx={{ minHeight: 220, display: "grid", placeItems: "center" }}><Typography color="text.secondary">{emptyMessage === "No statistics for this period." ? t("DASHBOARD_CHART.NO_DATA") : emptyMessage}</Typography></Box>
        ) : (
          <>
            <Box sx={{ width: "100%", overflow: "hidden" }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={title} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }} onMouseLeave={() => setHovered(null)}>
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                  const yy = padding.top + plotHeight * fraction;
                  return <g key={fraction}><line x1={padding.left} x2={chartWidth - padding.right} y1={yy} y2={yy} stroke="currentColor" opacity="0.12" /><text x={padding.left - 8} y={yy + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.65">{Math.round(maxValue * (1 - fraction))}</text></g>;
                })}
                {chartType === "bar" ? data.map((point, index) => {
                  const groupWidth = plotWidth / Math.max(data.length, 1) * 0.68;
                  const barWidth = groupWidth / activeSeries.length;
                  return <g key={`${label(point)}-${index}`} onMouseEnter={() => setHovered(index)}>{activeSeries.map((item, seriesIndex) => {
                    const value = Math.max(0, item.value(point));
                    const barHeight = padding.top + plotHeight - y(value);
                    return <rect key={item.key} x={x(index) - groupWidth / 2 + seriesIndex * barWidth} y={y(value)} width={Math.max(1, barWidth - 2)} height={barHeight} rx="3" fill={item.color} opacity={hovered === index ? 1 : 0.78}><title>{`${item.label}: ${item.format?.(value) ?? value}`}</title></rect>;
                  })}</g>;
                }) : activeSeries.map((item) => {
                  const points = data.map((point, index) => `${x(index)},${y(Math.max(0, item.value(point)))}`).join(" ");
                  return <g key={item.key}><polyline points={points} fill="none" stroke={item.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />{data.map((point, index) => <circle key={`${item.key}-${index}`} cx={x(index)} cy={y(Math.max(0, item.value(point)))} r={hovered === index ? 6 : 4} fill={item.color} stroke="currentColor" strokeWidth="2" onMouseEnter={() => setHovered(index)}><title>{`${label(point)} - ${item.label}: ${item.format?.(item.value(point)) ?? item.value(point)}`}</title></circle>)}</g>;
                })}
                {data.map((point, index) => data.length <= 8 || index % Math.ceil(data.length / 8) === 0 || index === data.length - 1 ? <text key={`label-${index}`} x={x(index)} y={chartHeight - 12} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.7">{formatDate?.(point.date) ?? point.date.slice(5)}</text> : null)}
                {hovered !== null ? <line x1={x(hovered)} x2={x(hovered)} y1={padding.top} y2={padding.top + plotHeight} stroke="currentColor" opacity="0.2" strokeDasharray="4 4" pointerEvents="none" /> : null}
              </svg>
            </Box>
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1 }}>
              {activeSeries.map((item) => <Stack direction="row" alignItems="center" spacing={0.75} key={item.key}><Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: item.color }} /><Typography variant="caption">{item.label}</Typography></Stack>)}
            </Stack>
            {currentPoint ? <Typography aria-live="polite" variant="body2" sx={{ mt: 1.5, p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
              <strong>{label(currentPoint)}</strong>{activeSeries.map((item) => ` - ${item.label}: ${item.format?.(item.value(currentPoint)) ?? item.value(currentPoint)}`).join("")}
            </Typography> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
