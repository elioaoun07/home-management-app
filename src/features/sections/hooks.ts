// src/features/sections/hooks.ts
import { qk } from "@/lib/queryKeys";
import { createClient } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
type Section = { id: string; name: string; position: number };

const move = <T>(arr: T[], from: number, to: number) => {
  const clone = arr.slice();
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
};

export function useSectionOrder(userId?: string) {
  return useQuery({
    queryKey: qk.sectionOrder(userId),
    queryFn: async (): Promise<Section[]> => {
      const { data, error } = await supabase
        .from("section_order")
        .select("id,name,position")
        .eq("user_id", userId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as Section[];
    },
  });
}

export function useReorderSections(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ from, to }: { from: number; to: number }) => {
      // server: recompute positions and persist
      const current = (
        qc.getQueryData<Section[]>(qk.sectionOrder(userId)) ?? []
      ).map((s, i) => ({ ...s, position: i }));
      const next = move(current, from, to).map((s, i) => ({
        ...s,
        position: i,
      }));
      const updates = next.map(({ id, position }) => ({ id, position }));
      const { error } = await supabase.from("section_order").upsert(updates);
      if (error) throw error;
      return true;
    },
    onMutate: async ({ from, to }) => {
      await qc.cancelQueries({ queryKey: qk.sectionOrder(userId) });
      const prev = qc.getQueryData<Section[]>(qk.sectionOrder(userId));
      if (prev) {
        qc.setQueryData<Section[]>(
          qk.sectionOrder(userId),
          move(prev, from, to).map((s, i) => ({ ...s, position: i }))
        );
      }
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.sectionOrder(userId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: qk.sectionOrder(userId),
        refetchType: "active",
      });
    },
  });
}
