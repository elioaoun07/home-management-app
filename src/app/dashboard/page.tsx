import TransactionsTable from "@/components/dashboard/TransactionsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Tx = {
  id: string;
  date: string; // assuming DATE or TIMESTAMP -> ISO string in JS
  category: string | null;
  subcategory: string | null;
  amount: number;
  description: string | null;
  account_id: string;
  inserted_at: string;
};

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function DashboardPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Defaults: current month (from the 1st to today)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultStart = fmtDate(startOfMonth);
  const defaultEnd = fmtDate(now);

  const sp = await searchParamsPromise;
  const start = (typeof sp?.start === "string" && sp.start) || defaultStart;
  const end = (typeof sp?.end === "string" && sp.end) || defaultEnd;

  // Fetch filtered transactions for the current user
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(
      "id, date, category, subcategory, amount, description, account_id, inserted_at"
    )
    .eq("user_id", user.id)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Failed to fetch transactions:", error);
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        {/* Date filter (GET form) */}
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <Label htmlFor="start">From</Label>
            <Input id="start" name="start" type="date" defaultValue={start} />
          </div>
          <div className="flex flex-col">
            <Label htmlFor="end">To</Label>
            <Input id="end" name="end" type="date" defaultValue={end} />
          </div>
          <Button type="submit">Filter</Button>
          {/* Reset link to clear query params */}
          <Button type="button" variant="ghost" asChild>
            <Link href="/dashboard">Reset</Link>
          </Button>
        </form>
      </div>

      <TransactionsTable
        rows={(transactions as Tx[]) ?? []}
        start={start}
        end={end}
      />
    </main>
  );
}
