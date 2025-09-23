import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await supabaseServer(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: link, error } = await supabase
    .from("household_links")
    .select(
      "id, code, owner_user_id, owner_email, partner_user_id, partner_email, active, created_at"
    )
    .or(`owner_user_id.eq.${user.id},partner_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { link: link ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
