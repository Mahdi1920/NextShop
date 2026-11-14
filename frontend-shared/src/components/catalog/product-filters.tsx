"use client";

import * as React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button as MuiButton,
  Card,
  Checkbox,
  Collapse,
  FormControlLabel,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { getCategoryPath, type Category } from "@shared/api/categories";
import type { ProductFacets } from "@shared/api/products/seller";
import { ProductSort } from "@shared/enums";
import { Button } from "@shared/components/ui/button";
import { useTranslations } from "@shared/context/locale-context";
import type { ProductListSource } from "@shared/hooks/useProductList";
import { formatCurrency } from "@shared/lib/date-utils";

export type ProductFiltersProps = {
  source: ProductListSource;
  categories: Category[];
  search: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  sort: ProductSort | string;
  isActive: string;
  inStock: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onPriceRangeChange: (min: string, max: string) => void;
  onSortChange: (value: ProductSort) => void;
  onIsActiveChange?: (value: "" | "true" | "false") => void;
  onInStockChange?: (value: "" | "true" | "false") => void;
  onApply: () => void;
  onClear: () => void;
  showCategorySelect?: boolean;
  facets?: ProductFacets;
  brands: string[];
  colors: string[];
  attributeFilters: Record<string, string[]>;
  onBrandsChange: (values: string[]) => void;
  onColorsChange: (values: string[]) => void;
  onAttributeFiltersChange: (value: Record<string, string[]>) => void;
};

function formatPrice(value: number) {
  return formatCurrency(value);
}

export function ProductFilters({
  source,
  categories,
  search,
  categoryId,
  minPrice,
  maxPrice,
  sort,
  isActive,
  inStock,
  onSearchChange,
  onCategoryChange,
  onMinPriceChange,
  onMaxPriceChange,
  onPriceRangeChange,
  onSortChange,
  onIsActiveChange,
  onInStockChange,
  onApply,
  onClear,
  showCategorySelect = true,
  facets,
  brands,
  colors,
  attributeFilters,
  onBrandsChange,
  onColorsChange,
  onAttributeFiltersChange,
}: ProductFiltersProps) {
  const t = useTranslations();
  const [moreFiltersOpen, setMoreFiltersOpen] = React.useState(false);
  const showManageFilters = source !== "catalog";
  const lowerBound = facets?.minPrice ?? 0;
  const upperBound = Math.max(facets?.maxPrice ?? 0, lowerBound + 1);
  const sliderValue: [number, number] = [
    Math.max(lowerBound, Math.min(upperBound, minPrice ? Number(minPrice) : lowerBound)),
    Math.max(lowerBound, Math.min(upperBound, maxPrice ? Number(maxPrice) : upperBound)),
  ];

  const renderFacetGroup = (
    label: string,
    options: string[],
    selected: string[],
    onChange: (values: string[]) => void,
  ) => options.length ? (
    <Accordion
      key={label}
      disableGutters
      elevation={0}
      sx={{ borderBottom: "1px solid", borderColor: "divider", "&:before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 48, "& .MuiAccordionSummary-content": { my: 1 } }}>
        <Typography color="primary.main" variant="body2" fontWeight={500}>{label}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0, pb: 1, maxHeight: 180, overflowY: "auto" }}>
        <Stack spacing={0.25}>
          {options.map((option) => (
            <FormControlLabel
              key={option}
              sx={{ mx: 0, minHeight: 32 }}
              control={<Checkbox size="small" checked={selected.includes(option)} onChange={(event) => {
                onChange(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option));
              }} />}
              label={<Typography variant="body2">{option}</Typography>}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  ) : null;

  return (
    <Card variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ bgcolor: "#1479bd", color: "common.white", textAlign: "center", py: 1.25, px: 1 }}>
        <Typography variant="subtitle2" fontWeight={800} letterSpacing={0.3}>FILTRER LES PRODUITS</Typography>
      </Box>
      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <Accordion
          defaultExpanded
          disableGutters
          elevation={0}
          sx={{ borderBottom: "1px solid", borderColor: "divider", "&:before": { display: "none" } }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 48, "& .MuiAccordionSummary-content": { my: 1 } }}>
            <Typography color="primary.main" variant="body2" fontWeight={500}>Prix</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pt: 0.5, pb: 1.5 }}>
            <Slider
              value={sliderValue}
              min={lowerBound}
              max={upperBound}
              valueLabelDisplay="auto"
              getAriaLabel={() => "Price range"}
              onChange={(_event, value) => {
                if (!Array.isArray(value)) return;
                onMinPriceChange(String(value[0]));
                onMaxPriceChange(String(value[1]));
              }}
              onChangeCommitted={(_event, value) => {
                if (!Array.isArray(value)) return;
                onPriceRangeChange(
                  value[0] <= lowerBound ? "" : String(value[0]),
                  value[1] >= upperBound ? "" : String(value[1]),
                );
              }}
              sx={{ py: 1, color: "#1479bd", "& .MuiSlider-thumb": { width: 16, height: 16 } }}
            />
            <Stack direction="row" justifyContent="space-between" sx={{ mt: -0.5 }}>
              <Typography variant="caption">{formatPrice(sliderValue[0])}</Typography>
              <Typography variant="caption">{formatPrice(sliderValue[1])}</Typography>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {renderFacetGroup("Marques", facets?.brands ?? [], brands, onBrandsChange)}
        {renderFacetGroup("Couleur", facets?.colors ?? [], colors, onColorsChange)}
        {Object.entries(facets?.attributes ?? {}).map(([key, options]) =>
          renderFacetGroup(key, options, attributeFilters[key] ?? [], (values) => {
            const next = { ...attributeFilters };
            if (values.length) next[key] = values;
            else delete next[key];
            onAttributeFiltersChange(next);
          }),
        )}

        <MuiButton
          fullWidth
          onClick={() => setMoreFiltersOpen((current) => !current)}
          sx={{ mt: 1.5, borderRadius: 2, bgcolor: "action.hover", color: "text.secondary", fontSize: 12, fontWeight: 700 }}
        >
          {moreFiltersOpen ? "−" : "+"} PLUS DE FILTRES
        </MuiButton>
        <Collapse in={moreFiltersOpen}>
          <Stack spacing={1.25} sx={{ pt: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              label={t("CATALOG.SEARCH")}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") onApply(); }}
            />
            {showCategorySelect ? (
              <TextField select fullWidth size="small" label={t("CATALOG.ALL_CATEGORIES")} value={categoryId} onChange={(event) => onCategoryChange(event.target.value)}>
                <MenuItem value="">{t("CATALOG.ALL_CATEGORIES")}</MenuItem>
                {categories.map((category) => <MenuItem key={category._id} value={category._id}>{getCategoryPath(category._id, categories)}</MenuItem>)}
              </TextField>
            ) : null}
            <TextField select fullWidth size="small" label={t("CATALOG.SORT_BY")} value={sort} onChange={(event) => onSortChange(event.target.value as ProductSort)}>
              <MenuItem value={ProductSort.NEWEST}>{t("CATALOG.SORT_NEWEST")}</MenuItem>
              <MenuItem value={ProductSort.PRICE_ASC}>{t("CATALOG.SORT_PRICE_ASC")}</MenuItem>
              <MenuItem value={ProductSort.PRICE_DESC}>{t("CATALOG.SORT_PRICE_DESC")}</MenuItem>
            </TextField>
            {showManageFilters ? (
              <>
                <TextField select fullWidth size="small" label={t("CATALOG.STATUS")} value={isActive} onChange={(event) => onIsActiveChange?.(event.target.value as "" | "true" | "false")}>
                  <MenuItem value="">{t("CATALOG.ALL_STATUSES")}</MenuItem>
                  <MenuItem value="true">{t("CATALOG.ACTIVE")}</MenuItem>
                  <MenuItem value="false">{t("CATALOG.INACTIVE")}</MenuItem>
                </TextField>
                <TextField select fullWidth size="small" label={t("CATALOG.STOCK")} value={inStock} onChange={(event) => onInStockChange?.(event.target.value as "" | "true" | "false")}>
                  <MenuItem value="">{t("CATALOG.ALL_STOCK")}</MenuItem>
                  <MenuItem value="true">{t("CATALOG.IN_STOCK_ONLY")}</MenuItem>
                  <MenuItem value="false">{t("CATALOG.OUT_OF_STOCK")}</MenuItem>
                </TextField>
              </>
            ) : null}
            <Stack direction="row" spacing={1}>
              <Button onClick={onApply} fullWidth>{t("CATALOG.APPLY_FILTERS")}</Button>
              <Button variant="outlined" onClick={onClear} fullWidth>{t("CATALOG.CLEAR_FILTERS")}</Button>
            </Stack>
          </Stack>
        </Collapse>
      </Box>
    </Card>
  );
}
