// src/app/api/accounts/[id]/route.ts
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // disable caching for this route

// PATCH /api/accounts/:id  — update { name?, type? }
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = supabaseServer(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const patch: Record<string, any> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }

  if (typeof body.type === "string") {
    const type = String(body.type).toLowerCase();
    if (!["expense", "income"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'expense' or 'income'" },
        { status: 400 }
      );
    }
    patch.type = type;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("accounts")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id) // enforce ownership
    .select("id,user_id,name,type,inserted_at")
    .single();

  if (error) {
    console.error("Error updating account:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}

// DELETE /api/accounts/:id  — delete account (if owned)
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = supabaseServer(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if ((error as any).code === "23505") {
      return NextResponse.json(
        { error: "Account name already exists" },
        { status: 409 }
      );
    }
    console.error("Error updating account:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
