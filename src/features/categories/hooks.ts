// src/features/categories/hooks.ts
"use client";

import { qk } from "@/lib/queryKeys";
import { createClient } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Category = {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  parent_id?: string | null; // null for top-level categories
  position?: number | null;
  visible?: boolean | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Queries ---
export function useCategories(userId?: string) {
  return useQuery({
    queryKey: qk.categories(userId),
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("user_categories")
        .select("id,name,icon,color,parent_id,position,visible")
        .eq("user_id", userId!); // ensure you pass userId
      if (error) throw error;
      // sort by position then name (consistent UI)
      return (data ?? []).sort((a, b) => {
        const pa = a.position ?? 9999;
        const pb = b.position ?? 9999;
        if (pa !== pb) return pa - pb;
        return a.name.localeCompare(b.name);
      });
    },
  });
}

// --- Mutations with optimistic UI ---
export function useCreateCategory(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Category, "id">) => {
      const { data, error } = await supabase
        .from("user_categories")
        .insert([{ ...input, user_id: userId }])
        .select("id,name,icon,color,parent_id,position,visible")
        .single();
      if (error) throw error;
      return data as Category;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.categories(userId) });
      const prev = qc.getQueryData<Category[]>(qk.categories(userId));
      const optimistic: Category = {
        id: `optimistic-${Math.random().toString(36).slice(2)}`,
        name: input.name,
        icon: input.icon ?? null,
        color: input.color ?? null,
        parent_id: input.parent_id ?? null,
        position: input.position ?? null,
        visible: input.visible ?? true,
      };
      qc.setQueryData<Category[]>(qk.categories(userId), (old = []) => [
        optimistic,
        ...old,
      ]);
      return { prev };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.categories(userId), ctx.prev);
    },
    onSettled: () => {
      // fetch canonical data from server
      qc.invalidateQueries({
        queryKey: qk.categories(userId),
        refetchType: "active",
      });
    },
  });
}

export function useUpdateCategory(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Category>;
    }) => {
      const { data, error } = await supabase
        .from("user_categories")
        .update(patch)
        .eq("id", id)
        .select("id,name,icon,color,parent_id,position,visible")
        .single();
      if (error) throw error;
      return data as Category;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.categories(userId) });
      const prev = qc.getQueryData<Category[]>(qk.categories(userId));
      qc.setQueryData<Category[]>(qk.categories(userId), (old = []) =>
        old.map((c) => (c.id === id ? { ...c, ...patch } : c))
      );
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.categories(userId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: qk.categories(userId),
        refetchType: "active",
      });
    },
  });
}

export function useDeleteCategory(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.categories(userId) });
      const prev = qc.getQueryData<Category[]>(qk.categories(userId));
      qc.setQueryData<Category[]>(qk.categories(userId), (old = []) =>
        old.filter((c) => c.id !== id)
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.categories(userId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: qk.categories(userId),
        refetchType: "active",
      });
    },
  });
}
