import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // disable caching

export async function GET(_req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY; // server-only
  const userId = process.env.DEV_USER_ID; // dev-only

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Missing SUPABASE env vars" },
      { status: 500 }
    );
  }
  if (!userId) {
    return NextResponse.json(
      { error: "DEV_USER_ID is required" },
      { status: 400 }
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("accounts")
    .select("id,user_id,name,type,inserted_at")
    .eq("user_id", userId)
    .order("inserted_at", { ascending: false });

  if (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "no-store" },
  });
}
