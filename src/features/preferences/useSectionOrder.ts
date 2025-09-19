import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useSectionOrder() {
  return useQuery({
    queryKey: ["section_order"],
    queryFn: async () => {
      const res = await fetch("/api/user-preferences");
      if (!res.ok) throw new Error("Failed to fetch section order");
      const data = await res.json();
      return (
        data?.section_order ?? [
          "account",
          "category",
          "subcategory",
          "amount",
          "description",
        ]
      );
    },
    staleTime: 60 * 1000,
  });
}

export function useUpdateSectionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (section_order: string[]) => {
      const res = await fetch("/api/user-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_order }),
      });
      if (!res.ok) throw new Error("Failed to update section order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["section_order"] });
    },
  });
}
