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
};

type Field = "date" | "amount" | "description" | "category" | "subcategory";
type EditingCell = { id: string; field: Field } | null;

export default function TransactionsTable({
  rows,
  start,
  end,
  onChange,
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
    else if (field === "date") v = String(row.date ?? "");
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
    if (!editing) return;
    const { id, field } = editing;
    const body: any = { id };
    if (field === "amount") body.amount = draft;
    if (field === "date") body.date = draft;
    if (field === "description") body.description = draft;
    if (field === "category") body.category_id = draft || null;
    if (field === "subcategory") body.subcategory_id = draft || null;
    setSaving(true);
    try {
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
                <TableRow key={t.id}>
                  <TableCell
                    onClick={() => !saving && beginEdit(t, "date")}
                    className="cursor-text"
                  >
                    {isEditing("date") ? (
                      <Input
                        type="date"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commit();
                          if (e.key === "Escape") cancel();
                        }}
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
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commit();
                          if (e.key === "Escape") cancel();
                        }}
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
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commit();
                          if (e.key === "Escape") cancel();
                        }}
                        autoFocus
                        disabled={saving}
                      />
                    ) : (
                      t.description
                    )}
                  </TableCell>
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
