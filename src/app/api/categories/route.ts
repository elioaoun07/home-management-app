import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // no caching

export async function GET(_req: NextRequest) {
  const supabase = supabaseServer(cookies());
  const accountId = _req.nextUrl.searchParams.get("accountId") ?? "";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!accountId)
    return NextResponse.json(
      { error: "accountId is required" },
      { status: 400 }
    );

  const { data, error } = await supabase
    .from("user_categories")
    .select("id,name,icon,color,parent_id,position,visible,account_id")
    .eq("user_id", user.id)
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
    account_id: c.account_id,
  }));
  return NextResponse.json(categories, {
    headers: { "Cache-Control": "no-store" },
  });
}
