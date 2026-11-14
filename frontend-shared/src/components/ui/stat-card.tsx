"use client";

import * as React from "react";
import Link from "next/link";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";

export interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  borderColor: string;
  href?: string;
  badge?: string;
  badgeColor?: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";
  isMonetary?: boolean;
}

export function StatCard({
  label,
  value,
  icon,
  borderColor,
  href,
  badge,
  badgeColor,
}: StatCardProps) {
  const content = (
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {label}
          </Typography>
          {badge && (
            <Chip
              label={badge}
              color={badgeColor ?? "default"}
              size="small"
              sx={{ mt: 0.5, height: 18, fontSize: 10 }}
            />
          )}
        </Box>
        <Box sx={{ color: borderColor, display: "flex", alignItems: "center" }}>{icon}</Box>
      </Stack>
      <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
        {value}
      </Typography>
    </CardContent>
  );

  const cardSx = {
    borderLeft: `4px solid ${borderColor}`,
    color: "inherit",
    textDecoration: "none",
    transition: "transform 120ms ease",
    "&:hover": href ? { transform: "translateY(-2px)" } : {},
  };

  if (href) {
    return (
      <Card component={Link} href={href} variant="outlined" sx={cardSx}>
        {content}
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={cardSx}>
      {content}
    </Card>
  );
}

