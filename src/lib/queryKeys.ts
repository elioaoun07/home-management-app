// src/lib/queryKeys.ts
export const qk = {
  accounts: (userId?: string) => ["accounts", { userId }] as const,
  categories: (userId?: string) => ["categories", { userId }] as const,
  subcategories: (categoryId: string) =>
    ["categories", categoryId, "subcategories"] as const,
  sectionOrder: (userId?: string) => ["section-order", { userId }] as const,
  templates: (userId?: string) => ["templates", { userId }] as const,
};
