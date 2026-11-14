import { apiClient } from "@shared/api/clients";
import type { Category } from "./index";

export type CreateCategoryInput = {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export const adminCategoriesApi = {
  async list(): Promise<Category[]> {
    const res = await apiClient.get<Category[]>("/categories");
    return res.data;
  },

  async create(input: CreateCategoryInput): Promise<Category> {
    const res = await apiClient.post<Category>("/categories", input);
    return res.data;
  },

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const res = await apiClient.put<Category>(`/categories/${id}`, input);
    return res.data;
  },

  async remove(id: string): Promise<{ ok: true }> {
    const res = await apiClient.delete<{ ok: true }>(`/categories/${id}`);
    return res.data;
  },
};

