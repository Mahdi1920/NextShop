import { ProductSort } from "@shared/enums";
import { apiClient } from "@shared/api/clients";

export type Product = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
  sellerId: string;
  categoryId: string;
  brand?: string;
  color?: string;
  attributes?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductCatalogFilters = {
  search?: string;
  categoryId?: string;
  categoryIds?: string[];
  brand?: string[];
  color?: string[];
  attributeFilters?: Record<string, string[]>;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort | "newest" | "price-asc" | "price-desc";
  page?: number;
  limit?: number;
  isActive?: boolean;
  inStock?: boolean;
  sellerId?: string;
};

export type PaginatedProducts = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets?: ProductFacets;
};

export type ProductFacets = {
  minPrice: number;
  maxPrice: number;
  brands: string[];
  colors: string[];
  attributes: Record<string, string[]>;
};

function toParams(filters: ProductCatalogFilters = {}) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== "" && value !== null)
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : key === "attributeFilters" ? JSON.stringify(value) : value]),
  );
}

function asId(value: unknown): string {
  if (value && typeof value === "object" && "_id" in value) return String((value as { _id: unknown })._id);
  return String(value ?? "");
}

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    _id: asId(product._id),
    sellerId: asId(product.sellerId),
    categoryId: asId(product.categoryId),
    images: Array.isArray(product.images) ? product.images : [],
    stock: Number(product.stock ?? 0),
    price: Number(product.price ?? 0),
    isActive: product.isActive !== false,
  };
}

function normalizePage(data: PaginatedProducts | Product[]): PaginatedProducts {
  if (Array.isArray(data)) {
    const items = data.map(normalizeProduct);
    return { items, total: items.length, page: 1, limit: items.length || 12, totalPages: 1 };
  }
  const items = (data.items ?? []).map(normalizeProduct);
  const total = Number(data.total ?? items.length);
  const page = Number(data.page ?? 1);
  const limit = Number(data.limit ?? 12);
  return {
    items,
    total,
    page,
    limit,
    totalPages: Number(data.totalPages ?? Math.max(1, Math.ceil(total / limit) || 1)),
    facets: data.facets,
  };
}

export const productsApi = {
  async listCatalog(filters: ProductCatalogFilters = {}): Promise<PaginatedProducts> {
    const res = await apiClient.get<PaginatedProducts | Product[]>("/products", { params: toParams(filters) });
    return normalizePage(res.data);
  },

  async listAdmin(filters: ProductCatalogFilters = {}): Promise<PaginatedProducts> {
    const res = await apiClient.get<PaginatedProducts | Product[]>("/products/admin", { params: toParams(filters) });
    return normalizePage(res.data);
  },
};

export type CreateProductInput = {
  name: string;
  description?: string;
  price: number;
  stock?: number;
  images?: string[];
  isActive?: boolean;
  categoryId: string;
  brand?: string;
  color?: string;
  attributes?: Record<string, string>;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export const sellerProductsApi = {
  async listMine(filters: ProductCatalogFilters = {}): Promise<PaginatedProducts> {
    const res = await apiClient.get<PaginatedProducts | Product[]>("/products/me", { params: toParams(filters) });
    return normalizePage(res.data);
  },

  async create(input: CreateProductInput): Promise<Product> {
    const res = await apiClient.post<Product>("/products", input);
    return res.data;
  },

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const res = await apiClient.put<Product>(`/products/${id}`, input);
    return res.data;
  },

  async remove(id: string): Promise<{ ok: true }> {
    const res = await apiClient.delete<{ ok: true }>(`/products/${id}`);
    return res.data;
  },

  async activate(id: string): Promise<Product> {
    const res = await apiClient.patch<Product>(`/products/${id}/activate`);
    return res.data;
  },

  async deactivate(id: string): Promise<Product> {
    const res = await apiClient.patch<Product>(`/products/${id}/deactivate`);
    return res.data;
  },
};

export const adminProductsApi = {
  list: productsApi.listAdmin,
  update: sellerProductsApi.update,
  remove: sellerProductsApi.remove,
  activate: sellerProductsApi.activate,
  deactivate: sellerProductsApi.deactivate,
};
