import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const supabase = supabaseServer(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await _req.json();
    const {
      name,
      icon,
      color,
      account_id,
      parent_id,
      position,
      default_category_id,
    } = body;

    if (!name || !account_id) {
      return NextResponse.json(
        { error: "name and account_id are required" },
        { status: 400 }
      );
    }

    // Check for duplicate slug (unique per user/account)
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const { data: existing, error: _dupError } = await supabase
      .from("user_categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("account_id", account_id)
      .eq("slug", slug)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists for this account." },
        { status: 409 }
      );
    }

    const insertDataSchema = z.object({
      user_id: z.string(),
      name: z.string(),
      icon: z.string().nullable(),
      color: z.string().nullable(),
      account_id: z.string(),
      parent_id: z.string().nullable(),
      position: z.number(),
      visible: z.boolean(),
      default_category_id: z.string().nullable(),
      // inserted_at, updated_at, slug handled by DB
    });

    const insertData = insertDataSchema.parse({
      user_id: user.id,
      name,
      icon: icon || null,
      color: color || null,
      account_id,
      parent_id: parent_id || null,
      position: typeof position === "number" ? position : 0,
      visible: true,
      default_category_id: default_category_id || null,
    });

    const { data, error } = await supabase
      .from("user_categories")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating category:", error);
      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Failed to create category:", err);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
