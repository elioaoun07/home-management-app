import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.env.DEV_USER_ID ?? "";
  if (!url || !serviceKey)
    return NextResponse.json(
      { error: "Missing SUPABASE env vars" },
      { status: 500 }
    );
  if (!userId)
    return NextResponse.json(
      { error: "DEV_USER_ID is required" },
      { status: 400 }
    );

  const { name, visible }: { name?: string; visible?: boolean } =
    await req.json();
  if (!name && typeof visible === "undefined") {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (typeof name === "string" && name.trim()) {
    updates.name = name.trim();
  }
  if (typeof visible === "boolean") updates.visible = visible;

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase
    .from("user_categories")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) {
    console.error("Update subcategory error", error);
    return NextResponse.json(
      { error: "Failed to update subcategory" },
      { status: 500 }
    );
  }
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.env.DEV_USER_ID ?? "";
  if (!url || !serviceKey)
    return NextResponse.json(
      { error: "Missing SUPABASE env vars" },
      { status: 500 }
    );
  if (!userId)
    return NextResponse.json(
      { error: "DEV_USER_ID is required" },
      { status: 400 }
    );

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  const { error } = await supabase
    .from("user_categories")
    .update({ visible: false })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    console.error("Delete subcategory error", error);
    return NextResponse.json(
      { error: "Failed to delete subcategory" },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
