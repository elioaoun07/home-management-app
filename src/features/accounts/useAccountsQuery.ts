"use client";

import { useQuery } from "@tanstack/react-query";

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  inserted_at: string;
};

async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch("/api/accounts", { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as Account[];
}

export function useAccountsQuery() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });
}
