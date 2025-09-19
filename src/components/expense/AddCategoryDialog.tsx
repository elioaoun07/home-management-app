"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export type AddCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  parentId?: string;
  onSuccess?: (category: any) => void;
};

export default function AddCategoryDialog({
  open,
  onOpenChange,
  accountId,
  parentId,
  onSuccess,
}: AddCategoryDialogProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          icon: icon || null,
          color: color || null,
          account_id: accountId,
          parent_id: parentId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add category");
      }
      const category = await res.json();
      onSuccess?.(category);
      setName("");
      setIcon("");
      setColor("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="category-icon">Icon (emoji or name)</Label>
            <Input
              id="category-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. 🛒 or Cart"
            />
          </div>
          <div>
            <Label htmlFor="category-color">Color</Label>
            <input
              id="category-color"
              type="color"
              value={color || "#1e90ff"}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 p-0 border-none bg-transparent cursor-pointer"
              style={{ background: "none" }}
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name}>
              {loading ? "Adding..." : "Add Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
