"use client";

import {
  DEFAULT_CATEGORIES,
  Category as DefaultCategory,
} from "@/constants/defaultCategories";
import { useQuery } from "@tanstack/react-query";

// Use the static Category type for consistency with defaults
export type Category = DefaultCategory;

async function fetchCategories(accountId: string): Promise<Category[]> {
  const qs = new URLSearchParams({ accountId });
  const res = await fetch(`/api/categories?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  const categories = (await res.json()) as Category[];
  // If no user categories, return static defaults
  if (!categories || categories.length === 0) {
    return DEFAULT_CATEGORIES;
  }
  return categories;
}

/** Query per selected account. */
export function useCategories(accountId?: string) {
  return useQuery({
    queryKey: ["categories", accountId],
    queryFn: () => fetchCategories(accountId as string),
    enabled: !!accountId,
  });
}
