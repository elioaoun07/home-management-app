import DateSettings from "@/components/dashboard/DateSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseServerRSC } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

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
  user_id?: string;
  user_name?: string;
};

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfCustomMonth(date: Date, monthStartDay: number) {
  const d = new Date(date);
  const currentDay = d.getDate();
  const s = new Date(d);
  if (currentDay >= monthStartDay) {
    s.setDate(monthStartDay);
  } else {
    s.setMonth(s.getMonth() - 1);
    s.setDate(monthStartDay);
  }
  s.setHours(0, 0, 0, 0);
  return s;
}

function parseMonthStartDay(dateStart?: string): number | null {
  if (!dateStart || typeof dateStart !== "string") return null;
  const m = dateStart.match(/^(sun|mon)-(\d{1,2})$/);
  if (!m) return null;
  const day = Number(m[2]);
  if (!Number.isInteger(day) || day < 1 || day > 28) return null;
  return day;
}

export default async function DashboardPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await supabaseServerRSC();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Ensure onboarding walkthrough for new users
  const { data: onboarding } = await supabase
    .from("user_onboarding")
    .select("completed, account_type")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!onboarding?.completed) {
    redirect("/welcome");
  }

  // Defaults respect user's custom month-start preference
  const now = new Date();
  let monthStartDay = 1;
  // Fetch preference (best-effort)
  const { data: prefsRow } = await supabase
    .from("user_preferences")
    .select("date_start")
    .eq("user_id", user.id)
    .maybeSingle();
  const parsedDay = parseMonthStartDay(prefsRow?.date_start as any);
  if (parsedDay) monthStartDay = parsedDay;

  const sCustom = startOfCustomMonth(now, monthStartDay);
  // End of the current custom month period is the day before next period start
  const nextPeriod = new Date(sCustom);
  nextPeriod.setMonth(nextPeriod.getMonth() + 1);
  nextPeriod.setDate(monthStartDay);
  const endOfPeriod = new Date(nextPeriod);
  endOfPeriod.setDate(endOfPeriod.getDate() - 1);
  const defaultStart = fmtDate(sCustom);
  const defaultEnd = fmtDate(endOfPeriod);

  const sp = await searchParamsPromise;
  const start = (typeof sp?.start === "string" && sp.start) || defaultStart;
  const end = (typeof sp?.end === "string" && sp.end) || defaultEnd;

  // Determine if user has a household link to include partner transactions
  const { data: link } = await supabase
    .from("household_links")
    .select(
      "owner_user_id, owner_email, partner_user_id, partner_email, active"
    )
    .or(`owner_user_id.eq.${user.id},partner_user_id.eq.${user.id}`)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const partnerId = link
    ? link.owner_user_id === user.id
      ? link.partner_user_id
      : link.owner_user_id
    : null;

  // Fetch filtered transactions for the current user (+ partner if linked)
  // and join minimal user display info from auth.users
  let query = supabase
    .from("transactions")
    .select(
      "id, date, category, subcategory, amount, description, account_id, inserted_at, user_id"
    )
    .gte("date", start)
    .lte("date", end)
    .order("inserted_at", { ascending: false })
    .limit(200);

  if (partnerId) {
    query = query.in("user_id", [user.id, partnerId]);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data: rawRows, error } = (await query) as any;

  if (error) {
    console.error("Failed to fetch transactions:", error);
  }

  // Compute display names without joining auth.users (blocked for anon key):
  // Use current user's metadata for "me" and emails from household link for partner.
  const meMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const meName =
    (meMeta.full_name as string | undefined) ||
    (meMeta.name as string | undefined) ||
    (user.email as string | undefined) ||
    undefined;
  let partnerName: string | undefined = undefined;
  if (partnerId && link) {
    partnerName =
      link.owner_user_id === partnerId
        ? (link.owner_email as string | undefined)
        : (link.partner_email as string | undefined);
    if (!partnerName) partnerName = "Partner";
  }

  const rows: Tx[] = (rawRows || []).map((r: any) => ({
    id: r.id,
    date: r.date,
    category: r.category,
    subcategory: r.subcategory,
    amount: r.amount,
    description: r.description,
    account_id: r.account_id,
    inserted_at: r.inserted_at,
    user_id: r.user_id,
    user_name:
      r.user_id === user.id
        ? meName || user.email || "Me"
        : partnerName || "Partner",
  }));

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
          {/* Date settings icon */}
          <DateSettings />
        </form>
      </div>

      <DashboardClient
        rows={rows}
        start={start}
        end={end}
        showUser={onboarding?.account_type === "household"}
      />
    </main>
  );
}
