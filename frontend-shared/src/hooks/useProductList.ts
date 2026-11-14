"use client";

import * as React from "react";
import {
  adminProductsApi,
  productsApi,
  sellerProductsApi,
  type PaginatedProducts,
  type Product,
  type ProductCatalogFilters,
  type ProductFacets,
} from "@shared/api/products/seller";
import { ProductSort } from "@shared/enums";

export type ProductListSource = "catalog" | "mine" | "admin";

export type ProductListState = {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  error: boolean;
  search: string;
  categoryId: string;
  categoryIds: string[];
  brands: string[];
  colors: string[];
  attributeFilters: Record<string, string[]>;
  facets?: ProductFacets;
  minPrice: string;
  maxPrice: string;
  sort: ProductSort;
  isActive: "" | "true" | "false";
  inStock: "" | "true" | "false";
};

const EMPTY: PaginatedProducts = { items: [], total: 0, page: 1, limit: 12, totalPages: 1 };

export function useProductList(source: ProductListSource, enabled = true) {
  const [search, setSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [categoryIds, setCategoryIds] = React.useState<string[]>([]);
  const [brands, setBrands] = React.useState<string[]>([]);
  const [colors, setColors] = React.useState<string[]>([]);
  const [attributeFilters, setAttributeFilters] = React.useState<Record<string, string[]>>({});
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [sort, setSort] = React.useState<ProductSort>(ProductSort.NEWEST);
  const [isActive, setIsActive] = React.useState<"" | "true" | "false">("");
  const [inStock, setInStock] = React.useState<"" | "true" | "false">("");
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(12);
  const [result, setResult] = React.useState<PaginatedProducts>(EMPTY);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  const appliedRef = React.useRef({ search, categoryId, categoryIds, brands, colors, attributeFilters, minPrice, maxPrice, sort, isActive, inStock });

  const buildFilters = React.useCallback(
    (nextPage = page): ProductCatalogFilters => {
      const applied = appliedRef.current;
      return {
        search: applied.search.trim() || undefined,
        categoryId: applied.categoryId || undefined,
        categoryIds: applied.categoryIds.length ? applied.categoryIds : undefined,
        brand: applied.brands.length ? applied.brands : undefined,
        color: applied.colors.length ? applied.colors : undefined,
        attributeFilters: Object.keys(applied.attributeFilters).length ? applied.attributeFilters : undefined,
        minPrice: applied.minPrice ? Number(applied.minPrice) : undefined,
        maxPrice: applied.maxPrice ? Number(applied.maxPrice) : undefined,
        sort: applied.sort,
        page: nextPage,
        limit,
        isActive: source === "catalog" ? undefined : applied.isActive === "" ? undefined : applied.isActive === "true",
        inStock: source === "catalog" ? undefined : applied.inStock === "" ? undefined : applied.inStock === "true",
      };
    },
    [limit, page, source],
  );

  const load = React.useCallback(
    async (nextPage = page) => {
      if (!enabled) return;
      setLoading(true);
      setError(false);
      try {
        const filters = buildFilters(nextPage);
        const data =
          source === "mine"
            ? await sellerProductsApi.listMine(filters)
            : source === "admin"
              ? await adminProductsApi.list(filters)
              : await productsApi.listCatalog(filters);
        setResult(data);
        setPage(data.page);
      } catch {
        setError(true);
        setResult(EMPTY);
      } finally {
        setLoading(false);
      }
    },
    [buildFilters, enabled, page, source],
  );

  React.useEffect(() => {
    if (enabled) void load(1);
    // initial + when source/enabled changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, source]);

  const applyFilters = React.useCallback(() => {
    appliedRef.current = { search, categoryId, categoryIds, brands, colors, attributeFilters, minPrice, maxPrice, sort, isActive, inStock };
    void load(1);
  }, [search, categoryId, categoryIds, brands, colors, attributeFilters, minPrice, maxPrice, sort, isActive, inStock, load]);

  const applyCategoryIds = React.useCallback((ids: string[]) => {
    setCategoryIds(ids);
    setBrands([]);
    setColors([]);
    setAttributeFilters({});
    setMinPrice("");
    setMaxPrice("");
    appliedRef.current = { ...appliedRef.current, categoryId: "", categoryIds: ids, brands: [], colors: [], attributeFilters: {}, minPrice: "", maxPrice: "" };
    void load(1);
  }, [load]);

  const applyBrands = React.useCallback((values: string[]) => {
    setBrands(values);
    appliedRef.current = { ...appliedRef.current, brands: values };
    void load(1);
  }, [load]);

  const applyColors = React.useCallback((values: string[]) => {
    setColors(values);
    appliedRef.current = { ...appliedRef.current, colors: values };
    void load(1);
  }, [load]);

  const applyAttributeFilters = React.useCallback((value: Record<string, string[]>) => {
    setAttributeFilters(value);
    appliedRef.current = { ...appliedRef.current, attributeFilters: value };
    void load(1);
  }, [load]);

  const applyPriceRange = React.useCallback((min: string, max: string) => {
    setMinPrice(min);
    setMaxPrice(max);
    appliedRef.current = { ...appliedRef.current, minPrice: min, maxPrice: max };
    void load(1);
  }, [load]);

  const applyIsActive = React.useCallback((value: "" | "true" | "false") => {
    setIsActive(value);
    appliedRef.current = { ...appliedRef.current, isActive: value };
    void load(1);
  }, [load]);

  const applyInStock = React.useCallback((value: "" | "true" | "false") => {
    setInStock(value);
    appliedRef.current = { ...appliedRef.current, inStock: value };
    void load(1);
  }, [load]);

  const clearFilters = React.useCallback(() => {
    setSearch("");
    setCategoryId("");
    setCategoryIds([]);
    setBrands([]);
    setColors([]);
    setAttributeFilters({});
    setMinPrice("");
    setMaxPrice("");
    setSort(ProductSort.NEWEST);
    setIsActive("");
    setInStock("");
    appliedRef.current = {
      search: "",
      categoryId: "",
      categoryIds: [],
      brands: [],
      colors: [],
      attributeFilters: {},
      minPrice: "",
      maxPrice: "",
      sort: ProductSort.NEWEST,
      isActive: "",
      inStock: "",
    };
    void load(1);
  }, [load]);

  const goToPage = React.useCallback(
    (next: number) => {
      void load(next);
    },
    [load],
  );

  const reload = React.useCallback(() => {
    void load(page);
  }, [load, page]);

  const state: ProductListState = {
    products: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
    loading,
    error,
    search,
    categoryId,
    categoryIds,
    brands,
    colors,
    attributeFilters,
    facets: result.facets,
    minPrice,
    maxPrice,
    sort,
    isActive,
    inStock,
  };

  return {
    ...state,
    setSearch,
    setCategoryId,
    setCategoryIds: applyCategoryIds,
    setBrands: applyBrands,
    setColors: applyColors,
    setAttributeFilters: applyAttributeFilters,
    setPriceRange: applyPriceRange,
    setMinPrice,
    setMaxPrice,
    setSort,
    setIsActive: applyIsActive,
    setInStock: applyInStock,
    applyFilters,
    clearFilters,
    goToPage,
    reload,
  };
}

export type ProductListController = ReturnType<typeof useProductList>;
