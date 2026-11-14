"use client";

import * as React from "react";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { Product } from "@shared/api/products/seller";
import { formatCurrency } from "@shared/lib/date-utils";
import { useTranslations } from "@shared/context/locale-context";

export type ProductCardProps = {
  product: Product;
  categoryName?: string;
  showStatus?: boolean;
  actions?: React.ReactNode;
  orientation?: "vertical" | "horizontal";
};

export function ProductCard({ product, categoryName, showStatus, actions, orientation = "vertical" }: ProductCardProps) {
  const t = useTranslations();
  const outOfStock = (product.stock ?? 0) <= 0;
  const horizontal = orientation === "horizontal";

  return (
    <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: horizontal ? { xs: "column", sm: "row" } : "column", overflow: "hidden" }}>
      {product.images?.[0] ? (
        <Box component="img" src={product.images[0]} alt={product.name} sx={horizontal
          ? { width: { xs: "100%", sm: 200 }, height: { xs: 170, sm: "100%" }, minHeight: { sm: 190 }, objectFit: "cover", flexShrink: 0 }
          : { width: "100%", height: 170, objectFit: "cover" }} />
      ) : (
        <Box sx={horizontal
          ? { width: { xs: "100%", sm: 200 }, height: { xs: 170, sm: "auto" }, minHeight: { sm: 190 }, bgcolor: "action.hover", display: "grid", placeItems: "center", color: "text.secondary", flexShrink: 0 }
          : { height: 170, bgcolor: "action.hover", display: "grid", placeItems: "center", color: "text.secondary" }}>
          {t("NAVBAR.PRODUCTS")}
        </Box>
      )}
      <CardContent sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: horizontal ? { xs: "column", md: "row" } : "column", gap: 2 }}>
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3 }}>{product.name}</Typography>
            {showStatus ? <Chip size="small" label={product.isActive ? t("CATALOG.ACTIVE") : t("CATALOG.INACTIVE")} color={product.isActive ? "success" : "default"} variant="outlined" /> : null}
          </Stack>
          {categoryName ? <Typography variant="caption" color="text.secondary">{categoryName}</Typography> : null}
          {product.description ? (
            <Typography variant="body2" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: horizontal ? 4 : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {product.description}
            </Typography>
          ) : null}
          {!horizontal ? <Typography fontWeight={800}>{formatCurrency(product.price)}</Typography> : null}
          {!horizontal ? <Typography variant="caption" color={outOfStock ? "error.main" : "success.main"}>{outOfStock ? t("CATALOG.OUT_OF_STOCK") : t("CATALOG.IN_STOCK").replace("{count}", String(product.stock))}</Typography> : null}
          {!horizontal && actions ? <Box sx={{ mt: "auto", pt: 1 }}>{actions}</Box> : null}
        </Stack>
        {horizontal ? (
          <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }} justifyContent="center" sx={{ minWidth: { md: 190 }, borderLeft: { md: "1px solid" }, borderColor: "divider", pl: { md: 2 } }}>
            {/* <Typography variant="body2" color="text.secondary">{t("CATALOG.AVAILABILITY")}</Typography> */}
            <Chip size="small" label={outOfStock ? t("CATALOG.UNAVAILABLE") : t("CATALOG.AVAILABLE")} color={outOfStock ? "error" : "success"} variant="outlined" />
            <Typography variant="h6" fontWeight={800}>{formatCurrency(product.price)}</Typography>
            {actions ? <Box sx={{ width: { xs: "100%", md: "auto" } }}>{actions}</Box> : null}
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}
