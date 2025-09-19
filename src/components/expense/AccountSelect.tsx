"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccountsQuery } from "@/features/accounts/useAccountsQuery";
import { useState } from "react";

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
  } = useAccountsQuery();
  const [internal, setInternal] = useState<string | undefined>(value);
  const selected = value ?? internal;

  const setSelected = (id: string) => {
    setInternal(id);
    onChange?.(id);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="account">Account</Label>
      <Select value={selected} onValueChange={setSelected} disabled={isError}>
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
    </div>
  );
}
