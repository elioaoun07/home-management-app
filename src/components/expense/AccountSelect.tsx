// src/components/expense/AccountSelect.tsx
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts, useCreateAccount } from "@/features/accounts/hooks";
import type { AccountType } from "@/types/domain";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  value?: string;
  onChange?: (id: string) => void;
};

const PLACEHOLDER = "Choose an account";

export default function AccountSelect({ value, onChange }: Props) {
  const {
    data: accounts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useAccounts();
  const createAccount = useCreateAccount();

  const [internal, setInternal] = useState<string | undefined>(value);
  const selected = value ?? internal;

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AccountType>("expense");

  useEffect(() => setInternal(value), [value]);

  // Auto-select default account if none selected
  useEffect(() => {
    if (value == null && !internal && accounts.length) {
      try {
        const def = localStorage.getItem("default_account_id");
        if (def && accounts.some((a) => a.id === def)) {
          setSelected(def);
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, value]);

  const setSelected = (id: string) => {
    setInternal(id);
    onChange?.(id);
  };

  const onAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Please enter an account name");
      return;
    }
    try {
      const created = await createAccount.mutateAsync({
        name: newName.trim(),
        type: newType,
      });
      toast.success("Account created");
      setSelected(created.id);
      setAddOpen(false);
      setNewName("");
      setNewType("expense");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create account"
      );
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="account">Account</Label>
      <Select
        value={selected}
        onValueChange={(val) => {
          if (val === "__add__") setAddOpen(true);
          else setSelected(val);
        }}
        disabled={isError}
      >
        <SelectTrigger id="account" className="w-full">
          <SelectValue placeholder={PLACEHOLDER} />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
          {!isLoading && accounts.length === 0 && (
            <SelectItem value="__none" disabled>
              No accounts found
            </SelectItem>
          )}
          <SelectItem value="__add__">+ Add Account</SelectItem>
        </SelectContent>
      </Select>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading accounts…</p>
      )}
      {isError && (
        <p className="text-sm text-red-500">
          Failed to load accounts:{" "}
          {error instanceof Error ? error.message : "Unknown"}{" "}
          <button type="button" className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </p>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onAddAccount}>
            <div>
              <Label>Account Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                required
                disabled={createAccount.isPending}
              />
            </div>
            <div>
              <Label>Type</Label>
              <RadioGroup
                value={newType}
                onValueChange={(v: AccountType) => setNewType(v)}
                className="flex gap-6 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="expense" id="type-expense" />
                  <Label htmlFor="type-expense">Expense</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="income" id="type-income" />
                  <Label htmlFor="type-income">Income</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={createAccount.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAccount.isPending}>
                {createAccount.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
