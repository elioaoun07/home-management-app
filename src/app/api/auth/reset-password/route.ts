import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({ email: z.string().email() });

function getOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  // Accept form or JSON
  const ct = req.headers.get("content-type") ?? "";
  let email = "";
  if (ct.includes("application/json")) {
    email = BodySchema.parse(await req.json()).email;
  } else {
    const form = await req.formData();
    email = BodySchema.parse({ email: String(form.get("email") || "") }).email;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const redirectTo = `${origin}/reset-password/update`; // page where user sets a new password
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return NextResponse.redirect(
      `${origin}/reset-password?error=${encodeURIComponent(error.message)}`,
      { status: 302 }
    );
  }

  return NextResponse.redirect(`${origin}/reset-password?sent=1`, {
    status: 302,
  });
}
