import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // no caching

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  const userId =
    req.nextUrl.searchParams.get("userId") ?? process.env.DEV_USER_ID ?? "";
  const accountId = req.nextUrl.searchParams.get("accountId") ?? "";

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Missing SUPABASE env vars" },
      { status: 500 }
    );
  }
  if (!userId)
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  if (!accountId)
    return NextResponse.json(
      { error: "accountId is required" },
      { status: 400 }
    );

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("user_categories")
    .select("id,name,icon,color,parent_id,position,visible")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("visible", true)
    .order("position", { ascending: true, nullsFirst: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("user_categories error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }

  // If no user categories, return empty array (client will use static defaults)
  if (!data || data.length === 0) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store" },
    });
  }
  // Return only the fields the UI needs
  const categories = data.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    parent_id: c.parent_id,
    position: c.position ?? 0,
  }));
  return NextResponse.json(categories, {
    headers: { "Cache-Control": "no-store" },
  });
}
