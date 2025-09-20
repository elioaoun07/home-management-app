// src/app/api/user-preferences/route.ts
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const supabase = supabaseServer(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .select("section_order")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return { section_order: [...] | null } — client handles fallback/defaults
  return NextResponse.json(data ?? { section_order: null }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(_req: NextRequest) {
  const supabase = supabaseServer(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await _req.json();
  const { section_order } = body ?? {};

  if (!Array.isArray(section_order)) {
    return NextResponse.json(
      { error: "section_order must be an array" },
      { status: 400 }
    );
  }

  // Upsert ensures we create the row if it doesn't exist
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, section_order }, { onConflict: "user_id" });

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
