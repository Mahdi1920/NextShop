"use client";

import * as React from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import OnlinePredictionIcon from "@mui/icons-material/OnlinePrediction";
import PeopleIcon from "@mui/icons-material/People";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import { StatCard } from "@shared/components/ui/stat-card";
import { useTranslations } from "@shared/context/locale-context";

export type UserDistribution = {
  label: string;
  value: number;
  color: string;
  breakdown?: Array<{ label: string; value: number }>;
};

type Props = { data: UserDistribution[]; totalUsers?: number | null; connectedUsers?: number | null; pendingSellerRequests?: number | null };

function pointAt(angle: number, radius: number) {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: 120 + radius * Math.cos(radians), y: 120 + radius * Math.sin(radians) };
}

function slicePath(startAngle: number, endAngle: number) {
  if (endAngle - startAngle >= 359.99) {
    return "M 120 28 A 92 92 0 1 1 120 212 A 92 92 0 1 1 120 28 Z";
  }
  const start = pointAt(startAngle, 92);
  const end = pointAt(endAngle, 92);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M 120 120 L ${start.x} ${start.y} A 92 92 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function UserDistributionPieChart({ data, totalUsers, connectedUsers, pendingSellerRequests }: Props) {
  const t = useTranslations();
  const [activeLabel, setActiveLabel] = React.useState<string | null>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let angle = 0;
  const slices = data.map((item) => {
    const start = angle;
    angle += total ? item.value / total * 360 : 0;
    return { ...item, start, end: angle };
  });
  const active = slices.find((item) => item.label === activeLabel);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: "100%", width: "100%" }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1, width: "100%", mx: "auto", "& .MuiCardContent-root": { p: 1.25, "&:last-child": { pb: 1.25 } }, "& .MuiTypography-h3": { fontSize: "1.75rem" } }}>
            <StatCard label={t("ADMIN_PAGE.TOTAL_USERS")} value={totalUsers ?? "—"} icon={<PeopleIcon />} borderColor="#3b82f6" />
            <StatCard label={t("ADMIN_PAGE.CONNECTED_USERS")} value={connectedUsers ?? "—"} icon={<OnlinePredictionIcon />} borderColor="#22c55e" badge={connectedUsers ? t("ADMIN_PAGE.ONLINE") : undefined} />
            <StatCard label={t("ADMIN_PAGE.PENDING_SELLER_REQUESTS")} value={pendingSellerRequests ?? "—"} icon={<PendingActionsIcon />} borderColor="#f59e0b" />
          </Box>
        {total === 0 ? (
          <Box sx={{ minHeight: 150, display: "grid", placeItems: "center" }}><Typography color="text.secondary">{t("ADMIN_PAGE.NO_USERS")}</Typography></Box>
        ) : (
          <Stack direction="row" alignItems="center" justifyContent="center" gap={2} sx={{ mt: 0.5 }}>
            <svg viewBox="0 0 240 240" role="img" aria-label={`User distribution, ${total} users`} style={{ width: 160, maxWidth: "45%", height: "auto" }}>
              {slices.map((item) => {
                const isActive = activeLabel === item.label;
                const tooltip = [
                  `${item.label}: ${item.value} ${t("ADMIN_PAGE.USERS")} (${Math.round(item.value / total * 100)}%)`,
                  ...(item.breakdown ?? []).map((detail) => `${detail.label}: ${detail.value}`),
                ].join("\n");
                return <path key={item.label} d={slicePath(item.start, item.end)} fill={item.color} opacity={activeLabel && !isActive ? 0.42 : 1} stroke="white" strokeWidth="2" style={{ cursor: "pointer", transform: isActive ? "scale(1.035)" : undefined, transformOrigin: "120px 120px", transition: "opacity 160ms ease, transform 160ms ease" }} onMouseEnter={() => setActiveLabel(item.label)} onMouseLeave={() => setActiveLabel(null)} onFocus={() => setActiveLabel(item.label)} onBlur={() => setActiveLabel(null)} onClick={() => setActiveLabel((current) => current === item.label ? null : item.label)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setActiveLabel(item.label); }} tabIndex={0} role="button" aria-label={tooltip.replace(/\n/g, ", ")}><title>{tooltip}</title></path>;
              })}
            </svg>
            <Stack spacing={0.75} sx={{ minWidth: 130 }}>
              {slices.map((item) => (
                <Box key={item.label} onMouseEnter={() => setActiveLabel(item.label)} onMouseLeave={() => setActiveLabel(null)} onFocus={() => setActiveLabel(item.label)} onBlur={() => setActiveLabel(null)} tabIndex={0} role="button" aria-label={`Highlight ${item.label}`} sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", opacity: activeLabel && activeLabel !== item.label ? 0.5 : 1 }}>
                  <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{item.label}</Typography>
                  <Typography variant="body2" fontWeight={800}>{item.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{Math.round(item.value / total * 100)}%</Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        )}
        {active ? <Typography aria-live="polite" variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 0.5 }}>
          {`${active.label}: ${active.value} ${t("ADMIN_PAGE.USERS")}${active.breakdown?.length ? ` - ${active.breakdown.map((detail) => `${detail.label}: ${detail.value}`).join(", ")}` : ""}`}
        </Typography> : null}
      </CardContent>
    </Card>
  );
}
