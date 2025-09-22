import { SITE_URL } from "@/lib/site-url";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const FormSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";

  let raw: Record<string, unknown> = {};
  if (ct.includes("application/json")) raw = await req.json();
  else {
    const form = await req.formData();
    raw = {
      password: form.get("password") ? String(form.get("password")) : "",
      confirm: form.get("confirm") ? String(form.get("confirm")) : undefined,
      access_token: form.get("access_token")
        ? String(form.get("access_token"))
        : undefined,
      refresh_token: form.get("refresh_token")
        ? String(form.get("refresh_token"))
        : undefined,
    };
  }

  const data = FormSchema.parse(raw);
  if (data.confirm && data.password !== data.confirm) {
    return NextResponse.redirect(
      `${SITE_URL}/reset-password/update?error=${encodeURIComponent("Passwords do not match")}`,
      { status: 302 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (data.access_token && data.refresh_token) {
    const { error: setErr } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (setErr) {
      return NextResponse.redirect(
        `${SITE_URL}/reset-password/update?error=${encodeURIComponent(setErr.message)}`,
        { status: 302 }
      );
    }
  }

  const { error: updErr } = await supabase.auth.updateUser({
    password: data.password,
  });
  if (updErr) {
    return NextResponse.redirect(
      `${SITE_URL}/reset-password/update?error=${encodeURIComponent(updErr.message)}`,
      { status: 302 }
    );
  }

  return NextResponse.redirect(`${SITE_URL}/login?reset=1`, { status: 302 });
}
