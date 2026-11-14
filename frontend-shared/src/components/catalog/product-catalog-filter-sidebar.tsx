"use client";

import * as React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button as MuiButton,
  Checkbox,
  Collapse,
  FormControlLabel,
  IconButton,
  Paper,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { Category } from "@shared/api/categories";
import type { ProductListController, ProductListSource } from "@shared/hooks/useProductList";
import { useTranslations } from "@shared/context/locale-context";
import { formatCurrency } from "@shared/lib/date-utils";

type FacetOption = { value: string; label: string };

type CategoryTreeItemsProps = {
  parentId: string | null;
  depth: number;
  childrenByParent: Map<string | null, Category[]>;
  selectedIds: string[];
  expandedIds: Set<string>;
  onSelectedIdsChange: (ids: string[]) => void;
  onExpandedIdsChange: React.Dispatch<React.SetStateAction<Set<string>>>;
};

function CategoryTreeItems({
  parentId,
  depth,
  childrenByParent,
  selectedIds,
  expandedIds,
  onSelectedIdsChange,
  onExpandedIdsChange,
}: CategoryTreeItemsProps) {
  return <>
    {(childrenByParent.get(parentId) ?? []).map((category) => (
      <Box key={category._id}>
        <Stack direction="row" alignItems="center" sx={{ pl: depth * 1.5 }}>
          <FormControlLabel
            sx={{ m: 0, flex: 1, minWidth: 0, alignItems: "flex-start" }}
            control={<Checkbox size="small" checked={selectedIds.includes(category._id)} onChange={(event) => {
              onSelectedIdsChange(event.target.checked
                ? [...selectedIds, category._id]
                : selectedIds.filter((id) => id !== category._id));
            }} />}
            label={<Typography variant="body2" sx={{ pt: 0.75 }}>{category.name}</Typography>}
          />
          {childrenByParent.has(category._id) ? (
            <IconButton
              size="small"
              aria-label={`${expandedIds.has(category._id) ? "Collapse" : "Expand"} ${category.name}`}
              aria-expanded={expandedIds.has(category._id)}
              onClick={() => onExpandedIdsChange((current) => {
                const next = new Set(current);
                if (next.has(category._id)) next.delete(category._id);
                else next.add(category._id);
                return next;
              })}
            >
              <ExpandMoreIcon sx={{ transform: expandedIds.has(category._id) ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
            </IconButton>
          ) : null}
        </Stack>
        {childrenByParent.has(category._id) ? (
          <Collapse in={expandedIds.has(category._id)} timeout="auto" unmountOnExit>
            <CategoryTreeItems
              parentId={category._id}
              depth={depth + 1}
              childrenByParent={childrenByParent}
              selectedIds={selectedIds}
              expandedIds={expandedIds}
              onSelectedIdsChange={onSelectedIdsChange}
              onExpandedIdsChange={onExpandedIdsChange}
            />
          </Collapse>
        ) : null}
      </Box>
    ))}
  </>;
}

export type ProductCatalogFilterSidebarProps = {
  source: ProductListSource;
  categories: Category[];
  catalog: ProductListController;
};

function formatPrice(value: number) {
  return formatCurrency(value);
}

export function ProductCatalogFilterSidebar({ source, categories, catalog }: ProductCatalogFilterSidebarProps) {
  const t = useTranslations();
  const [expandedCategoryIds, setExpandedCategoryIds] = React.useState<Set<string>>(() => new Set());
  const [categoryTreeExpanded, setCategoryTreeExpanded] = React.useState(true);
  const [priceFilterExpanded, setPriceFilterExpanded] = React.useState(true);

  const childrenByParent = React.useMemo(() => {
    const byId = new Set(categories.map((category) => category._id));
    const tree = new Map<string | null, Category[]>();
    for (const category of categories) {
      const parentId = category.parentId && byId.has(category.parentId) ? category.parentId : null;
      const siblings = tree.get(parentId) ?? [];
      siblings.push(category);
      tree.set(parentId, siblings);
    }
    for (const siblings of tree.values()) siblings.sort((left, right) => left.name.localeCompare(right.name));
    return tree;
  }, [categories]);

  const lowerPrice = catalog.facets?.minPrice ?? 0;
  const upperPrice = Math.max(catalog.facets?.maxPrice ?? 0, lowerPrice + 1);
  const priceRange: [number, number] = [
    Math.max(lowerPrice, Math.min(upperPrice, catalog.minPrice ? Number(catalog.minPrice) : lowerPrice)),
    Math.max(lowerPrice, Math.min(upperPrice, catalog.maxPrice ? Number(catalog.maxPrice) : upperPrice)),
  ];

  const renderCheckboxFacet = (label: string, options: string[], selected: string[], onChange: (values: string[]) => void) =>
    options.length ? (
      <Accordion key={label} disableGutters elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider", "&:before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.5, minHeight: 48, "& .MuiAccordionSummary-content": { my: 1 } }}>
          <Typography color="primary.main" variant="body2">{label}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1, maxHeight: 180, overflowY: "auto" }}>
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

  const renderExclusiveFacet = (label: string, options: FacetOption[], selected: string, onChange: (value: string) => void) => (
    <Accordion key={label} disableGutters elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider", "&:before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.5, minHeight: 48, "& .MuiAccordionSummary-content": { my: 1 } }}>
        <Typography color="primary.main" variant="body2">{label}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1 }}>
        <Stack spacing={0.25}>
          {options.map((option) => (
            <FormControlLabel
              key={option.value}
              sx={{ mx: 0, minHeight: 32 }}
              control={<Checkbox size="small" checked={selected === option.value} onChange={(event) => onChange(event.target.checked ? option.value : "")} />}
              label={<Typography variant="body2">{option.label}</Typography>}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ bgcolor: "#1479bd", color: "common.white", textAlign: "center", py: 1.25, px: 1 }}>
        <Typography variant="subtitle2" fontWeight={800} letterSpacing={0.3}>FILTRER LES PRODUITS</Typography>
      </Box>
      <Accordion
        expanded={priceFilterExpanded}
        onChange={(_event, expanded) => setPriceFilterExpanded(expanded)}
        disableGutters
        elevation={0}
        sx={{ borderBottom: "1px solid", borderColor: "divider", "&:before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 48, "& .MuiAccordionSummary-content": { my: 1 } }}>
          <Typography color="primary.main" variant="body2">Prix</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2, pt: 0.5, pb: 1.5 }}>
          <Slider
            value={priceRange}
            min={lowerPrice}
            max={upperPrice}
            valueLabelDisplay="auto"
            getAriaLabel={() => "Price range"}
            onChange={(_event, value) => {
              if (!Array.isArray(value)) return;
              catalog.setMinPrice(String(value[0]));
              catalog.setMaxPrice(String(value[1]));
            }}
            onChangeCommitted={(_event, value) => {
              if (!Array.isArray(value)) return;
              catalog.setPriceRange(value[0] <= lowerPrice ? "" : String(value[0]), value[1] >= upperPrice ? "" : String(value[1]));
            }}
            sx={{ py: 1, color: "#1479bd", "& .MuiSlider-thumb": { width: 16, height: 16 } }}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: -0.5 }}>
            <Typography variant="caption">{formatPrice(priceRange[0])}</Typography>
            <Typography variant="caption">{formatPrice(priceRange[1])}</Typography>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={categoryTreeExpanded}
        onChange={(_event, expanded) => setCategoryTreeExpanded(expanded)}
        disableGutters
        elevation={0}
        sx={{ borderBottom: "1px solid", borderColor: "divider", "&:before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.5, minHeight: 48, "& .MuiAccordionSummary-content": { my: 1 } }}>
          <Typography color="primary.main" variant="body2">{t("CATALOG.ALL_CATEGORIES")}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 1, pt: 0, pb: 1, maxHeight: 280, overflowY: "auto" }}>
          <CategoryTreeItems
            parentId={null}
            depth={0}
            childrenByParent={childrenByParent}
            selectedIds={catalog.categoryIds}
            expandedIds={expandedCategoryIds}
            onSelectedIdsChange={catalog.setCategoryIds}
            onExpandedIdsChange={setExpandedCategoryIds}
          />
        </AccordionDetails>
      </Accordion>

      {renderCheckboxFacet("Marques", catalog.facets?.brands ?? [], catalog.brands, catalog.setBrands)}
      {renderCheckboxFacet("Couleur", catalog.facets?.colors ?? [], catalog.colors, catalog.setColors)}
      {Object.entries(catalog.facets?.attributes ?? {}).map(([key, options]) =>
        renderCheckboxFacet(key, options, catalog.attributeFilters[key] ?? [], (values) => {
          const next = { ...catalog.attributeFilters };
          if (values.length) next[key] = values;
          else delete next[key];
          catalog.setAttributeFilters(next);
        }),
      )}
      {source !== "catalog" ? (
        <>
          {renderExclusiveFacet(t("CATALOG.STATUS"), [
            { value: "true", label: t("CATALOG.ACTIVE") },
            { value: "false", label: t("CATALOG.INACTIVE") },
          ], catalog.isActive, (value) => catalog.setIsActive(value as "" | "true" | "false"))}
          {renderExclusiveFacet(t("CATALOG.STOCK"), [
            { value: "true", label: t("CATALOG.IN_STOCK_ONLY") },
            { value: "false", label: t("CATALOG.OUT_OF_STOCK") },
          ], catalog.inStock, (value) => catalog.setInStock(value as "" | "true" | "false"))}
        </>
      ) : null}
      <Box sx={{ p: 1.5 }}>
        <MuiButton fullWidth onClick={catalog.clearFilters} sx={{ borderRadius: 2, bgcolor: "action.hover", color: "text.secondary", fontSize: 12, fontWeight: 700 }}>
          {t("CATALOG.CLEAR_FILTERS")}
        </MuiButton>
      </Box>
    </Paper>
  );
}
