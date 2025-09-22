import { SITE_URL } from "@/lib/site-url";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
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

  const redirectTo = `${SITE_URL}/reset-password/update`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return NextResponse.redirect(
      `${SITE_URL}/reset-password?error=${encodeURIComponent(error.message)}`,
      { status: 302 }
    );
  }

  return NextResponse.redirect(`${SITE_URL}/reset-password?sent=1`, {
    status: 302,
  });
}
