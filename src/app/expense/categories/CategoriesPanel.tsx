// src/app/expense/categories/CategoriesPanel.tsx
"use client";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
} from "@/features/categories/hooks";

export default function CategoriesPanel({ userId }: { userId: string }) {
  const { data: categories, isPending } = useCategories(userId);
  const createCategory = useCreateCategory(userId);
  const deleteCategory = useDeleteCategory(userId);

  if (isPending) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
      <button
        onClick={() => createCategory.mutate({ name: "New Category" })}
        className="rounded-md border px-3 py-1"
      >
        + Add
      </button>

      <ul>
        {categories?.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-1">
            <span>{c.name}</span>
            <button
              onClick={() => deleteCategory.mutate(c.id)}
              className="text-sm underline"
            >
              delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
