import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const supabase = supabaseServer(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, visible }: { name?: string; visible?: boolean } =
    await _req.json();
  if (!name && typeof visible === "undefined") {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (typeof name === "string" && name.trim()) {
    updates.name = name.trim();
  }
  if (typeof visible === "boolean") {
    updates.visible = visible;
  }

  const { data, error } = await supabase
    .from("user_categories")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Update category error", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const supabase = supabaseServer(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Soft delete: set visible=false for the category and all its children
  const { error: err1 } = await supabase
    .from("user_categories")
    .update({ visible: false })
    .eq("user_id", user.id)
    .in("id", [id]);
  if (err1) {
    console.error("Soft delete category error", err1);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
  // Also hide its subcategories
  const { error: err2 } = await supabase
    .from("user_categories")
    .update({ visible: false })
    .eq("user_id", user.id)
    .eq("parent_id", id);
  if (err2) {
    console.error("Soft delete subcategories error", err2);
    return NextResponse.json(
      { error: "Failed to delete subcategories" },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
