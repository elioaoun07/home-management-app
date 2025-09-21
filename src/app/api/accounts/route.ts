import { DEFAULT_ACCOUNTS } from "@/constants/defaultCategories";
import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // disable caching

export async function GET(_req: NextRequest) {
  // Use SSR client bound to request cookies to identify the logged-in user
  const supabase = supabaseServer(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("accounts")
    .select("id,user_id,name,type,inserted_at")
    .eq("user_id", user.id)
    .order("inserted_at", { ascending: false });

  if (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If no accounts exist for this user, return the static defaults (not persisted)
  if (!data || data.length === 0) {
    const fallback = DEFAULT_ACCOUNTS.map((a) => ({
      id: a.id, // stable slug id; client treats as string id
      user_id: user.id,
      name: a.name,
      type: a.type.toLowerCase() as "income" | "expense",
      inserted_at: new Date().toISOString(),
    }));

    return NextResponse.json(fallback, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  // Create a new account for the authenticated user
  const supabase = supabaseServer(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, type } = body || {};

    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 }
      );
    }

    // Optional: constrain type to known values
    const typeNorm = String(type).toLowerCase();
    if (!["expense", "income"].includes(typeNorm)) {
      return NextResponse.json(
        { error: "type must be 'expense' or 'income'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("accounts")
      .insert({ user_id: user.id, name: String(name).trim(), type: typeNorm })
      .select("id,user_id,name,type,inserted_at")
      .single();

    if (error) {
      // 👍 handle unique violation
      if ((error as any).code === "23505") {
        return NextResponse.json(
          { error: "Account name already exists" },
          { status: 409 }
        );
      }
      console.error("Error creating account:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("Failed to create account:", e);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
