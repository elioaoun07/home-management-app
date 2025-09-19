import { supabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await supabaseServer();

  // Clear the server-side (httpOnly) auth cookies
  await supabase.auth.signOut();

  // Returning a response ensures Set-Cookie headers are applied
  return NextResponse.json({ ok: true });
}
