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
      // Fetch from server first so DB is canonical
      const res = await fetch("/api/user-preferences", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch section order");
      const data = await res.json();
      const arr = Array.isArray(data?.section_order)
        ? (data.section_order as string[])
        : [...DEFAULT_ORDER];
      const known = new Set(DEFAULT_ORDER);
      const filtered = arr.filter((k): k is SectionKey => known.has(k as any));
      const missing = DEFAULT_ORDER.filter((k) => !filtered.includes(k));
      const result = [...filtered, ...missing];

      // Persist server result to localStorage for faster subsequent reads
      try {
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem("user_preferences");
          const existing = raw ? JSON.parse(raw) : {};
          const merged = {
            ...existing,
            section_order: result,
            theme: data?.theme,
          };
          localStorage.setItem("user_preferences", JSON.stringify(merged));
        }
      } catch (e) {
        // ignore localStorage errors
      }

      return result;
    },
    // rely on global defaults: staleTime: Infinity etc. (Providers)
  });
}
export function usePreferenceTheme(userId?: string) {
  return useQuery({
    queryKey: [...qk.sectionOrder(userId), "theme"] as const,
    queryFn: async (): Promise<string | undefined> => {
      // Prefer server value as canonical
      const res = await fetch("/api/user-preferences", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch preferences");
      const data = await res.json();

      try {
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem("user_preferences");
          const existing = raw ? JSON.parse(raw) : {};
          const merged = { ...existing, theme: data?.theme };
          localStorage.setItem("user_preferences", JSON.stringify(merged));
        }
      } catch (e) {
        // ignore
      }

      return data?.theme;
    },
  });
}

export function useUpdatePreferences(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      section_order?: SectionKey[];
      theme?: string;
    }) => {
      const res = await fetch("/api/user-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: qk.sectionOrder(userId) });
      const previous = qc.getQueryData(qk.sectionOrder(userId));
      // Apply optimistic update in cache
      if (next.section_order) {
        qc.setQueryData(qk.sectionOrder(userId), {
          section_order: next.section_order,
        });
      }
      if (next.theme) {
        qc.setQueryData(qk.sectionOrder(userId), (old: any) => ({
          ...(old || {}),
          theme: next.theme,
        }));
      }
      // Persist to localStorage for offline/local persistence
      try {
        const existingRaw =
          typeof window !== "undefined"
            ? localStorage.getItem("user_preferences")
            : null;
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        const merged = {
          ...existing,
          ...(next.section_order ? { section_order: next.section_order } : {}),
          ...(next.theme ? { theme: next.theme } : {}),
        };
        if (typeof window !== "undefined")
          localStorage.setItem("user_preferences", JSON.stringify(merged));
      } catch (e) {
        // ignore
      }
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
