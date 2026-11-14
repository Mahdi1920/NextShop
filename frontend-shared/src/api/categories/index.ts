import { apiClient } from "@shared/api/clients";

export type Category = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function getCategoryPath(categoryId: string, categories: Category[]): string {
  const byId = new Map(categories.map((category) => [category._id, category]));
  const names: string[] = [];
  const visited = new Set<string>();
  let current = byId.get(categoryId);
  while (current && !visited.has(current._id)) {
    visited.add(current._id);
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return names.join(" › ") || byId.get(categoryId)?.name || "";
}

export function getCategoryLeafIds(categories: Category[]): Set<string> {
  const parents = new Set(categories.map((category) => category.parentId).filter((id): id is string => Boolean(id)));
  return new Set(categories.filter((category) => !parents.has(category._id)).map((category) => category._id));
}

export function getCategoryDescendantIds(categoryId: string, categories: Category[]): Set<string> {
  const descendants = new Set([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && descendants.has(category.parentId) && !descendants.has(category._id)) {
        descendants.add(category._id);
        changed = true;
      }
    }
  }
  return descendants;
}

export const categoriesApi = {
  async list(): Promise<Category[]> {
    const response = await apiClient.get<Category[]>("/categories");
    return response.data;
  },
};

export * from "./admin";
