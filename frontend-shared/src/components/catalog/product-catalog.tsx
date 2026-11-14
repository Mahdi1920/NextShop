"use client";

import * as React from "react";
import { Alert, Box, Pagination, Stack, Typography } from "@mui/material";
import { getCategoryPath, type Category } from "@shared/api/categories";
import type { Product } from "@shared/api/products/seller";
import { ProductCard } from "@shared/components/catalog/product-card";
import { ProductCatalogFilterSidebar } from "@shared/components/catalog/product-catalog-filter-sidebar";
import { useTranslations } from "@shared/context/locale-context";
import type { ProductListController, ProductListSource } from "@shared/hooks/useProductList";

export type ProductCatalogProps = {
  source: ProductListSource;
  catalog: ProductListController;
  categories: Category[];
  showStatus?: boolean;
  productOrientation?: "vertical" | "horizontal";
  renderActions?: (product: Product) => React.ReactNode;
  toolbar?: React.ReactNode;
};

export function ProductCatalog({
  source,
  catalog,
  categories,
  showStatus,
  productOrientation = "horizontal",
  renderActions,
  toolbar,
}: ProductCatalogProps) {
  const t = useTranslations();
  const categoryNameById = React.useMemo(
    () => Object.fromEntries(categories.map((category) => [category._id, getCategoryPath(category._id, categories)])),
    [categories],
  );

  return (
    <Stack spacing={2}>
      {toolbar}
      {catalog.error ? <Alert severity="error">{t("CATALOG.LOAD_ERROR")}</Alert> : null}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "280px minmax(0, 1fr)" }, gap: 2, alignItems: "start" }}>
      <Box sx={{ minWidth: 0 }}><ProductCatalogFilterSidebar source={source} categories={categories} catalog={catalog} /></Box>
      <Box sx={{ minWidth: 0 }}>
      {catalog.loading ? (
        <Typography>{t("CATALOG.LOADING")}</Typography>
      ) : catalog.products.length === 0 ? (
        <Alert severity="info">{t("CATALOG.NO_PRODUCTS")}</Alert>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: productOrientation === "horizontal" ? "1fr" : { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
          {catalog.products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              categoryName={categoryNameById[product.categoryId]}
              showStatus={showStatus}
              orientation={productOrientation}
              actions={renderActions?.(product)}
            />
          ))}
        </Box>
      )}
      </Box>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          {t("CATALOG.SHOWING")
            .replace("{count}", String(catalog.products.length))
            .replace("{total}", String(catalog.total))}
        </Typography>
        <Pagination
          page={catalog.page}
          count={catalog.totalPages}
          color="primary"
          onChange={(_event, next) => catalog.goToPage(next)}
        />
      </Stack>
    </Stack>
  );
}
