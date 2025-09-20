"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCategories } from "@/features/categories/useCategoriesQuery";
import { Pencil } from "lucide-react";
import { useState } from "react";
import AddCategoryDialog from "./AddCategoryDialog";
import CategoryManagerDialog from "./CategoryManagerDialog";

type Props = {
  accountId?: string;
  selectedCategoryId?: string;
  onCategorySelect?: (categoryId: string) => void;
};

export default function CategoryGrid({
  accountId,
  selectedCategoryId,
  onCategorySelect,
}: Props) {
  const {
    data: categories = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCategories(accountId);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  if (!accountId) {
    return (
      <div className="space-y-3">
        <Label>Category</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            type="button"
            className="justify-start opacity-50"
            disabled
          >
            Select an account first
          </Button>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Label>Category</Label>
        <div className="text-sm text-red-500">
          Error loading categories:{" "}
          {error instanceof Error ? error.message : "Unknown"}
          <button
            type="button"
            className="underline ml-2"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Support both DB categories (with parent_id) and default categories (with subcategories)
  const roots = Array.isArray(categories)
    ? categories.filter((c) => !("parent_id" in c) || !c.parent_id)
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Category</Label>
        {accountId && (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setManageOpen(true)}
            aria-label="Manage categories"
            title="Manage categories"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Button
                key={i}
                variant="outline"
                type="button"
                className="justify-start opacity-50"
                disabled
              >
                Loading...
              </Button>
            ))
          : roots.map((cat) => {
              const active = selectedCategoryId === cat.id;
              return (
                <Button
                  key={cat.id}
                  variant={active ? "default" : "outline"}
                  type="button"
                  className="justify-start gap-2"
                  onClick={() => onCategorySelect?.(cat.id)}
                  style={{
                    backgroundColor: active
                      ? (cat.color ?? undefined)
                      : undefined,
                    borderColor: cat.color ?? undefined,
                  }}
                >
                  {cat.icon && <span className="text-lg">{cat.icon}</span>}
                  <span>{cat.name}</span>
                </Button>
              );
            })}

        <Button
          variant="secondary"
          type="button"
          className="justify-start"
          onClick={() => setAddDialogOpen(true)}
        >
          + Add Category
        </Button>
        <AddCategoryDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          accountId={accountId}
          onSuccess={() => {
            setAddDialogOpen(false);
            refetch();
          }}
        />
        <CategoryManagerDialog
          open={manageOpen}
          onOpenChange={(o) => {
            setManageOpen(o);
          }}
          accountId={accountId}
          onChange={() => {
            refetch();
          }}
        />
      </div>
    </div>
  );
}
