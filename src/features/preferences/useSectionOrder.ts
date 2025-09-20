// src/features/preferences/useSectionOrder.ts
"use client";

import { qk } from "@/lib/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const DEFAULT_ORDER = [
  "account",
  "category",
  "subcategory",
  "amount",
  "description",
] as const;

export type SectionKey = (typeof DEFAULT_ORDER)[number];

export function useSectionOrder(userId?: string) {
  return useQuery({
    queryKey: qk.sectionOrder(userId),
    queryFn: async (): Promise<SectionKey[]> => {
      const res = await fetch("/api/user-preferences", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch section order");
      const data = await res.json();
      // API returns { section_order: string[] | null }
      const arr = Array.isArray(data?.section_order)
        ? (data.section_order as string[])
        : [...DEFAULT_ORDER];
      // Guard: keep only known keys & in order; fill any missing at the end
      const known = new Set(DEFAULT_ORDER);
      const filtered = arr.filter((k): k is SectionKey => known.has(k as any));
      const missing = DEFAULT_ORDER.filter((k) => !filtered.includes(k));
      return [...filtered, ...missing];
    },
    // rely on global defaults: staleTime: Infinity etc. (Providers)
  });
}

export function useUpdateSectionOrder(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (section_order: SectionKey[]) => {
      const res = await fetch("/api/user-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_order }),
      });
      if (!res.ok) throw new Error("Failed to update section order");
      return res.json();
    },
    // Optimistic local update for instant UI feedback
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: qk.sectionOrder(userId) });
      const previous = qc.getQueryData<SectionKey[]>(qk.sectionOrder(userId));
      qc.setQueryData<SectionKey[]>(qk.sectionOrder(userId), next);
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.sectionOrder(userId), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: qk.sectionOrder(userId),
        refetchType: "active",
      });
    },
  });
}
