// src/app/api/user-preferences/route.ts
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const supabase = await supabaseServer(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .select("section_order, theme")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Always return both keys, let client handle defaulting
  return NextResponse.json(data ?? { section_order: null, theme: null }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(_req: NextRequest) {
  const supabase = await supabaseServer(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await _req.json();
  const { section_order, theme } = body ?? {};

  if (section_order !== undefined && !Array.isArray(section_order)) {
    return NextResponse.json(
      { error: "section_order must be an array" },
      { status: 400 }
    );
  }

  // Build upsert payload with provided fields only
  const payload: Record<string, any> = { user_id: user.id };
  if (section_order !== undefined) payload.section_order = section_order;
  if (theme !== undefined) {
    // Only allow 'light' | 'dark'. Anything else becomes null (system default)
    const t = theme === "light" || theme === "dark" ? theme : null;
    payload.theme = t;
  }

  // Upsert ensures we create or update the row
  const { error } = await supabase
    .from("user_preferences")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { success: true },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
