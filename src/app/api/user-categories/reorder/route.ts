import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  updates: z.array(
    z.object({
      id: z.string().min(1),
      position: z.number().int().min(1),
    })
  ),
});

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success || parsed.data.updates.length === 0) {
    return NextResponse.json(
      { error: "Invalid or empty payload" },
      { status: 400 }
    );
  }

  try {
    for (const { id, position } of parsed.data.updates) {
      const { error } = await supabase
        .from("user_categories")
        .update({ position })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Update position failed", { id, position, error });
        return NextResponse.json(
          { error: "Failed to update positions" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("Reorder error", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
