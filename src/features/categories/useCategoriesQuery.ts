"use client";

import {
  DEFAULT_CATEGORIES,
  Category as DefaultCategory,
} from "@/constants/defaultCategories";
import { useQuery } from "@tanstack/react-query";

// Use the static Category type for consistency with defaults
export type Category = DefaultCategory;

async function fetchCategories(
  accountId: string,
  userId?: string
): Promise<Category[]> {
  const qs = new URLSearchParams({ accountId });
  if (userId) qs.set("userId", userId);
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

/** Query per selected account; pass userId if you want to override DEV_USER_ID on the server. */
export function useCategories(accountId?: string, userId?: string) {
  return useQuery({
    queryKey: ["categories", accountId, userId ?? "server-default"],
    queryFn: () => fetchCategories(accountId as string, userId),
    enabled: !!accountId,
  });
}
