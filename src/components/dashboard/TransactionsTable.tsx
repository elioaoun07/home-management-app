"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type Tx = {
  id: string;
  date: string; // YYYY-MM-DD
  category: string | null;
  subcategory: string | null;
  amount: number;
  description: string | null;
  account_id: string;
  inserted_at: string;
};

type Props = {
  rows: Tx[];
  start: string;
  end: string;
  onChange?: (updated: Tx) => void;
  // Deferred mode: don't call API per cell, let parent collect patches and save in batch
  deferredSave?: boolean;
  dirtyIds?: Set<string>;
  onDeferredChange?: (
    updated: Tx,
    patch: {
      id: string;
      date?: string;
      amount?: number | string;
      description?: string | null;
      category_id?: string | null | "";
      subcategory_id?: string | null | "";
    }
  ) => void;
  // Optional per-row actions in deferred mode
  onSaveRow?: (id: string) => void;
  onDiscardRow?: (id: string) => void;
  saving?: boolean;
  rowErrors?: Record<string, string | undefined>;
};

type Field = "date" | "amount" | "description" | "category" | "subcategory";
type EditingCell = { id: string; field: Field } | null;

export default function TransactionsTable({
  rows,
  start,
  end,
  onChange,
  deferredSave = false,
  dirtyIds,
  onDeferredChange,
  onSaveRow,
  onDiscardRow,
  saving: savingAll,
  rowErrors,
}: Props) {
  const [editing, setEditing] = useState<EditingCell>(null);
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [dataRows, setDataRows] = useState<Tx[]>(rows);
  const [categoriesByAccount, setCategoriesByAccount] = useState<
    Record<
      string,
      Array<{ id: string; name: string; parent_id?: string | null }>
    >
  >({});

  useEffect(() => {
    setDataRows(rows);
  }, [rows]);

  // Prefetch categories for all accounts present in the table
  useEffect(() => {
    const accountIds = Array.from(new Set(rows.map((r) => r.account_id)));
    const missing = accountIds.filter((id) => !categoriesByAccount[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries: Array<
        [string, Array<{ id: string; name: string; parent_id?: string | null }>]
      > = [];
      for (const accId of missing) {
        try {
          const qs = new URLSearchParams({ accountId: accId });
          const res = await fetch(`/api/categories?${qs.toString()}`, {
            cache: "no-store",
          });
          if (!res.ok) continue;
          const data = (await res.json()) as Array<{
            id: string;
            name: string;
            parent_id?: string | null;
          }>;
          entries.push([accId, data]);
        } catch {}
      }
      if (!cancelled && entries.length) {
        setCategoriesByAccount((prev) => {
          const next = { ...prev };
          for (const [k, v] of entries) next[k] = v;
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rows, categoriesByAccount]);

  const beginEdit = (row: Tx, field: Field) => {
    setEditing({ id: row.id, field });
    let v = "";
    if (field === "amount") v = String(row.amount);
    else if (field === "date") v = String(row.date ?? "").slice(0, 10);
    else if (field === "description") v = String(row.description ?? "");
    else if (field === "category") {
      const cats = categoriesByAccount[row.account_id] || [];
      const current = cats.find((c) => c.name === row.category && !c.parent_id);
      v = current?.id ?? "__none__";
    } else if (field === "subcategory") {
      const cats = categoriesByAccount[row.account_id] || [];
      // Try to find parent id from name
      const parent = cats.find((c) => c.name === row.category && !c.parent_id);
      const current = parent
        ? cats.find(
            (c) => c.parent_id === parent.id && c.name === row.subcategory
          )
        : undefined;
      v = current?.id ?? "__none__";
    }
    setDraft(v);
  };

  const commit = async () => {
    if (!editing || saving) return;
    const { id, field } = editing;
    const body: any = { id };
    if (deferredSave && onDeferredChange) {
      // Apply locally and emit a patch without calling the server
      setSaving(true);
      try {
        let computedPatch: any | null = null;
        let computedUpdated: Tx | null = null;
        setDataRows((prev) =>
          prev.map((r) => {
            if (r.id !== id) return r;
            const next: Tx = { ...r };
            const patch: any = { id };
            if (field === "amount") {
              patch.amount = draft;
              next.amount = Number(draft || 0);
            }
            if (field === "date") {
              patch.date = draft;
              next.date = String(draft);
            }
            if (field === "description") {
              patch.description = draft;
              next.description = draft;
            }
            if (field === "category") {
              const cats = categoriesByAccount[r.account_id] || [];
              if (draft === "__none__") {
                patch.category_id = ""; // clear server-side
                patch.subcategory_id = "";
                next.category = "";
                next.subcategory = "";
              } else {
                patch.category_id = draft;
                const c = cats.find((c) => c.id === draft);
                next.category = c?.name ?? r.category;
                // reset subcategory when category changes
                patch.subcategory_id = "";
                next.subcategory = "";
              }
            }
            if (field === "subcategory") {
              const cats = categoriesByAccount[r.account_id] || [];
              if (draft === "__none__") {
                patch.subcategory_id = "";
                next.subcategory = "";
              } else {
                patch.subcategory_id = draft;
                const s = cats.find((c) => c.id === draft);
                next.subcategory = s?.name ?? r.subcategory;
              }
            }
            computedPatch = patch;
            computedUpdated = { ...next };
            return next;
          })
        );
        // Schedule parent callback after state commit to avoid cross-render warnings
        if (computedPatch && computedUpdated) {
          setTimeout(
            () => onDeferredChange(computedUpdated!, computedPatch!),
            0
          );
        }
        setEditing(null);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Immediate save mode
    setSaving(true);
    try {
      if (field === "amount") body.amount = draft;
      if (field === "date") body.date = draft;
      if (field === "description") body.description = draft;
      if (field === "category") {
        body.category_id = draft === "__none__" ? "" : draft;
        body.subcategory_id = ""; // reset
      }
      if (field === "subcategory") {
        body.subcategory_id = draft === "__none__" ? "" : draft;
      }
      const res = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = "Failed to update";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        toast.error(msg);
        return;
      }
      const updated: Tx = await res.json();
      toast.success("Updated");
      if (onChange) onChange(updated);
      else {
        setDataRows((prev) =>
          prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
        );
      }
      setEditing(null);
    } catch (e) {
      console.error("Update failed", e);
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setEditing(null);
    setDraft("");
  };

  // In deferred mode, mark row dirty immediately on change (without closing editor)
  const queueLocalPatch = (id: string, field: Field, value: string) => {
    if (!deferredSave || !onDeferredChange) return;
    const row = dataRows.find((r) => r.id === id);
    if (!row) return;
    const next: Tx = { ...row };
    const patch: any = { id };
    if (field === "amount") {
      patch.amount = value;
      next.amount = Number(value || 0);
    }
    if (field === "date") {
      patch.date = value;
      next.date = String(value);
    }
    if (field === "description") {
      patch.description = value;
      next.description = value;
    }
    if (field === "category") {
      const cats = categoriesByAccount[row.account_id] || [];
      if (value === "__none__") {
        patch.category_id = "";
        patch.subcategory_id = "";
        next.category = "";
        next.subcategory = "";
      } else {
        patch.category_id = value;
        const c = cats.find((c) => c.id === value);
        next.category = c?.name ?? row.category;
        patch.subcategory_id = "";
        next.subcategory = "";
      }
    }
    if (field === "subcategory") {
      const cats = categoriesByAccount[row.account_id] || [];
      if (value === "__none__") {
        patch.subcategory_id = "";
        next.subcategory = "";
      } else {
        patch.subcategory_id = value;
        const s = cats.find((c) => c.id === value);
        next.subcategory = s?.name ?? row.subcategory;
      }
    }
    // update local table immediately
    setDataRows((prev) => prev.map((r) => (r.id === id ? next : r)));
    // schedule parent notification to avoid cross-render warnings
    setTimeout(() => onDeferredChange(next, patch), 0);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Subcategory</TableHead>
            <TableHead className="text-right w-[140px]">Amount</TableHead>
            <TableHead>Description</TableHead>
            {deferredSave ? (
              <TableHead className="w-[160px] text-right">Actions</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground text-center py-8"
              >
                No transactions yet.
              </TableCell>
            </TableRow>
          ) : (
            dataRows.map((t) => {
              const isEditing = (f: Field) =>
                editing?.id === t.id && editing.field === f;
              return (
                <TableRow
                  key={t.id}
                  className={
                    dirtyIds?.has(t.id)
                      ? "bg-amber-100/30 dark:bg-amber-400/20"
                      : undefined
                  }
                >
                  <TableCell
                    onClick={() => !saving && beginEdit(t, "date")}
                    className="cursor-text"
                  >
                    {isEditing("date") ? (
                      <Input
                        type="date"
                        value={draft}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft(val);
                          if (editing) queueLocalPatch(editing.id, "date", val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commit();
                          if (e.key === "Escape") cancel();
                        }}
                        onBlur={commit}
                        autoFocus
                        disabled={saving}
                      />
                    ) : (
                      t.date?.slice(0, 10)
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => !saving && beginEdit(t, "category")}
                    className="cursor-text"
                  >
                    {isEditing("category") ? (
                      <Select
                        value={draft}
                        onValueChange={async (val) => {
                          setDraft(val);
                          if (editing)
                            queueLocalPatch(editing.id, "category", val);
                          await commit();
                        }}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue
                            placeholder={t.category || "Select category"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {(categoriesByAccount[t.account_id] || [])
                            .filter((c) => !c.parent_id)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      t.category
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => !saving && beginEdit(t, "subcategory")}
                    className="cursor-text"
                  >
                    {isEditing("subcategory") ? (
                      <Select
                        value={draft}
                        onValueChange={async (val) => {
                          setDraft(val);
                          if (editing)
                            queueLocalPatch(editing.id, "subcategory", val);
                          await commit();
                        }}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue
                            placeholder={t.subcategory || "Select subcategory"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {(() => {
                            const cats =
                              categoriesByAccount[t.account_id] || [];
                            const parent = cats.find(
                              (c) => c.name === t.category && !c.parent_id
                            );
                            const subs = parent
                              ? cats.filter((c) => c.parent_id === parent.id)
                              : [];
                            return subs.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    ) : (
                      t.subcategory
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => !saving && beginEdit(t, "amount")}
                    className="text-right cursor-text"
                  >
                    {isEditing("amount") ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft(val);
                          if (editing)
                            queueLocalPatch(editing.id, "amount", val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commit();
                          if (e.key === "Escape") cancel();
                        }}
                        onBlur={commit}
                        autoFocus
                        disabled={saving}
                        className="text-right"
                      />
                    ) : (
                      Number(t.amount).toFixed(2)
                    )}
                  </TableCell>
                  <TableCell
                    onClick={() => !saving && beginEdit(t, "description")}
                    className="max-w-[400px] truncate cursor-text"
                    title={t.description ?? undefined}
                  >
                    {isEditing("description") ? (
                      <Input
                        value={draft}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft(val);
                          if (editing)
                            queueLocalPatch(editing.id, "description", val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commit();
                          if (e.key === "Escape") cancel();
                        }}
                        onBlur={commit}
                        autoFocus
                        disabled={saving}
                      />
                    ) : (
                      t.description
                    )}
                  </TableCell>
                  {deferredSave ? (
                    <TableCell className="text-right">
                      {dirtyIds?.has(t.id) ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="text-sm px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSaveRow?.(t.id);
                            }}
                            disabled={!!savingAll}
                          >
                            Save
                          </button>
                          <button
                            className="text-sm px-2 py-1 rounded border disabled:opacity-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDiscardRow?.(t.id);
                            }}
                            disabled={!!savingAll}
                          >
                            Revert
                          </button>
                        </div>
                      ) : rowErrors?.[t.id] ? (
                        <div className="text-right text-red-600 text-xs">
                          {rowErrors[t.id]}
                        </div>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })
          )}
        </TableBody>
        <TableCaption>
          Showing <span className="font-medium">{dataRows.length}</span>{" "}
          transactions from {start} to {end}
        </TableCaption>
      </Table>
    </div>
  );
}
