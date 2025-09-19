"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCategories } from "@/features/categories/useCategoriesQuery";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  onChange?: () => void; // notify parent to refetch
};

type UICategory = {
  id: string;
  name: string;
  parent_id: string | null;
  icon?: string | null;
  position?: number | null;
};

export default function CategoryManagerDialog({
  open,
  onOpenChange,
  accountId,
  onChange,
}: Props) {
  const { data: categories = [], refetch } = useCategories(accountId);

  const isDbCategories =
    Array.isArray(categories) &&
    categories.length > 0 &&
    typeof (categories as any)[0] === "object" &&
    "parent_id" in (categories as any)[0];

  const all = useMemo<UICategory[]>(
    () =>
      isDbCategories
        ? (categories as unknown as UICategory[]).map((c) => ({
            id: c.id,
            name: c.name,
            parent_id: c.parent_id,
            icon: c.icon ?? null,
            position: c.position ?? null,
          }))
        : [],
    [categories, isDbCategories]
  );

  const roots = useMemo(
    () =>
      all
        .filter((c) => !c.parent_id)
        .sort(
          (a, b) =>
            (a.position ?? 1e9) - (b.position ?? 1e9) ||
            a.name.localeCompare(b.name)
        ),
    [all]
  );

  const getSubs = (parentId: string) =>
    all
      .filter((c) => c.parent_id === parentId)
      .sort(
        (a, b) =>
          (a.position ?? 1e9) - (b.position ?? 1e9) ||
          a.name.localeCompare(b.name)
      );

  // UI State
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<{
    type:
      | "cat-rename"
      | "cat-del"
      | "sub-rename"
      | "sub-del"
      | "reorder-save"
      | null;
    id?: string;
  }>({ type: null });
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState<string>("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState<string>("");

  const [confirmCatDeleteId, setConfirmCatDeleteId] = useState<string | null>(
    null
  );
  const [confirmSubDeleteId, setConfirmSubDeleteId] = useState<string | null>(
    null
  );

  // Reorder mode
  const [reorderMode, setReorderMode] = useState(false);
  const [positions, setPositions] = useState<Record<string, number>>({}); // id -> local position

  // Initialize local positions when categories change or dialog opens
  useEffect(() => {
    if (!open || !isDbCategories) return;
    const next: Record<string, number> = {};
    for (const c of all) {
      next[c.id] = Math.max(1, Math.floor(c.position ?? 1e9)); // undefined -> huge; we’ll normalize before save
    }
    setPositions(next);
  }, [open, isDbCategories, all]);

  function setPos(id: string, v: string) {
    // enforce positive integers; empty = ignore
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    setPositions((p) => ({ ...p, [id]: Math.max(1, Math.floor(n)) }));
  }

  // ------- rename / delete actions (unchanged) -------
  async function patchCategoryName(id: string, name: string) {
    setLoading({ type: "cat-rename", id });
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Category renamed");
      await refetch();
      onChange?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to rename category";
      toast.error(msg);
    } finally {
      setLoading({ type: null });
    }
  }

  async function deleteCategory(id: string) {
    setLoading({ type: "cat-del", id });
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Category deleted");
      await refetch();
      onChange?.();
      setConfirmCatDeleteId(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete category";
      toast.error(msg);
    } finally {
      setLoading({ type: null });
    }
  }

  async function patchSubcategoryName(id: string, name: string) {
    setLoading({ type: "sub-rename", id });
    try {
      const res = await fetch(`/api/categories/subcategories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Subcategory renamed");
      await refetch();
      onChange?.();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to rename subcategory";
      toast.error(msg);
    } finally {
      setLoading({ type: null });
    }
  }

  async function deleteSubcategory(id: string) {
    setLoading({ type: "sub-del", id });
    try {
      const res = await fetch(`/api/categories/subcategories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Subcategory deleted");
      await refetch();
      onChange?.();
      setConfirmSubDeleteId(null);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to delete subcategory";
      toast.error(msg);
    } finally {
      setLoading({ type: null });
    }
  }

  // ------- reorder save -------
  function normalizeSequential(ids: string[]) {
    // Sort by the local input value, then assign 1..N (stable)
    const sorted = [...ids].sort((a, b) => {
      const av = positions[a] ?? 1e9;
      const bv = positions[b] ?? 1e9;
      return av - bv;
    });
    const out: Record<string, number> = {};
    sorted.forEach((id, i) => (out[id] = i + 1));
    return out;
  }

  async function saveOrder() {
    setLoading({ type: "reorder-save" });

    try {
      // 1) Normalize root orders
      const rootIds = roots.map((c) => c.id);
      const rootSeq = normalizeSequential(rootIds);

      // 2) Normalize each sub-list independently
      const subSeq: Record<string, number> = {};
      for (const r of roots) {
        const subs = getSubs(r.id);
        const ids = subs.map((s) => s.id);
        const seq = normalizeSequential(ids);
        for (const id of ids) subSeq[id] = seq[id];
      }

      // 3) Compute updates only for changed positions
      const updates: Array<{ id: string; position: number }> = [];
      for (const r of roots) {
        const current = Math.max(1, Math.floor(r.position ?? 1e9));
        const next = rootSeq[r.id];
        if (current !== next) updates.push({ id: r.id, position: next });
      }
      for (const r of roots) {
        for (const s of getSubs(r.id)) {
          const current = Math.max(1, Math.floor(s.position ?? 1e9));
          const next = subSeq[s.id];
          if (current !== next) updates.push({ id: s.id, position: next });
        }
      }

      if (updates.length === 0) {
        toast.info("No changes to save");
        setReorderMode(false);
        return;
      }

      const res = await fetch("/api/user-categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to save order");
      }

      toast.success("Order saved");
      setReorderMode(false);
      await refetch();
      onChange?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save order";
      toast.error(msg);
    } finally {
      setLoading({ type: null });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        {!isDbCategories ? (
          <div className="text-sm text-muted-foreground">
            You're currently using default categories. Create a custom category
            first to edit or delete.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Reorder toolbar */}
            <div className="flex items-center gap-2">
              {!reorderMode ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setReorderMode(true)}
                >
                  Reorder
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={saveOrder}
                    disabled={loading.type === "reorder-save"}
                  >
                    {loading.type === "reorder-save"
                      ? "Saving..."
                      : "Save order"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReorderMode(false);
                      // reset to DB positions
                      const reset: Record<string, number> = {};
                      for (const c of all)
                        reset[c.id] = Math.max(
                          1,
                          Math.floor(c.position ?? 1e9)
                        );
                      setPositions(reset);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>

            <ScrollArea className="max-h-96 pr-2">
              <ul className="divide-y">
                {roots.map((cat) => {
                  const isExpanded = !!expanded[cat.id];
                  const subs = getSubs(cat.id);
                  const isBusy = loading.id === cat.id && loading.type !== null;
                  const isEditing = editingCatId === cat.id;

                  return (
                    <li key={cat.id} className="py-2">
                      <div className="flex items-center justify-between">
                        <button
                          className="flex items-center gap-2 flex-1 text-left"
                          onClick={() =>
                            setExpanded((e) => ({ ...e, [cat.id]: !e[cat.id] }))
                          }
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          {cat.icon && (
                            <span className="text-lg">{cat.icon}</span>
                          )}
                          {isEditing ? (
                            <input
                              className="ml-1 border rounded px-2 py-1 text-sm flex-1 min-w-0"
                              value={editingCatName}
                              onChange={(e) =>
                                setEditingCatName(e.target.value)
                              }
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              autoFocus
                            />
                          ) : (
                            <span className="flex-1">{cat.name}</span>
                          )}
                        </button>

                        {/* Root position input in reorder mode */}
                        {reorderMode && (
                          <div className="w-16">
                            <Input
                              type="number"
                              min={1}
                              value={positions[cat.id] ?? ""}
                              onChange={(e) => setPos(cat.id, e.target.value)}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const nn = editingCatName.trim();
                                  if (!nn) return;
                                  void patchCategoryName(cat.id, nn);
                                  setEditingCatId(null);
                                }}
                                disabled={loading.type !== null}
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingCatId(null);
                                  setEditingCatName("");
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingCatId(cat.id);
                                  setEditingCatName(cat.name ?? "");
                                }}
                                aria-label="Rename"
                                disabled={isBusy || reorderMode}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {confirmCatDeleteId === cat.id ? (
                                <>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void deleteCategory(cat.id);
                                    }}
                                    disabled={loading.type !== null}
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setConfirmCatDeleteId(null);
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setConfirmCatDeleteId(cat.id);
                                  }}
                                  aria-label="Delete"
                                  disabled={isBusy || reorderMode}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <ul className="mt-2 ml-6 border-l pl-3 space-y-1">
                          {subs.map((sub) => {
                            const isSubBusy =
                              loading.id === sub.id && loading.type !== null;
                            const isSubEditing = editingSubId === sub.id;

                            return (
                              <li
                                key={sub.id}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  {sub.icon && (
                                    <span className="text-lg">{sub.icon}</span>
                                  )}
                                  {isSubEditing ? (
                                    <input
                                      className="border rounded px-2 py-1 text-sm flex-1"
                                      value={editingSubName}
                                      onChange={(e) =>
                                        setEditingSubName(e.target.value)
                                      }
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      autoFocus
                                    />
                                  ) : (
                                    <span className="flex-1">{sub.name}</span>
                                  )}
                                </div>

                                {/* Sub position input in reorder mode */}
                                {reorderMode && (
                                  <div className="w-16">
                                    <Input
                                      type="number"
                                      min={1}
                                      value={positions[sub.id] ?? ""}
                                      onChange={(e) =>
                                        setPos(sub.id, e.target.value)
                                      }
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                    />
                                  </div>
                                )}

                                <div className="flex items-center gap-1">
                                  {isSubEditing ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const nn = editingSubName.trim();
                                          if (!nn) return;
                                          void patchSubcategoryName(sub.id, nn);
                                          setEditingSubId(null);
                                        }}
                                        disabled={loading.type !== null}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setEditingSubId(null);
                                          setEditingSubName("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setEditingSubId(sub.id);
                                          setEditingSubName(sub.name ?? "");
                                        }}
                                        aria-label="Rename"
                                        disabled={isSubBusy || reorderMode}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      {confirmSubDeleteId === sub.id ? (
                                        <>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              void deleteSubcategory(sub.id);
                                            }}
                                            disabled={loading.type !== null}
                                          >
                                            Confirm
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setConfirmSubDeleteId(null);
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                        </>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setConfirmSubDeleteId(sub.id);
                                          }}
                                          aria-label="Delete"
                                          disabled={isSubBusy || reorderMode}
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                          {subs.length === 0 && (
                            <li className="text-sm text-muted-foreground">
                              No subcategories.
                            </li>
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}
                {roots.length === 0 && (
                  <li className="py-2 text-sm text-muted-foreground">
                    No categories.
                  </li>
                )}
              </ul>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
