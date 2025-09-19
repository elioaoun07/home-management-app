import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (error)
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    return NextResponse.json({ ok: true, users: data.users?.length ?? 0 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
