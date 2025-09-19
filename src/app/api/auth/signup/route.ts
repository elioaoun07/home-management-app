import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let email: string | undefined;
    let password: string | undefined;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      email = body.email;
      password = body.password;
    } else {
      const form = await req.formData();
      email = form.get("email") as string | undefined;
      password = form.get("password") as string | undefined;
    }

    if (!email || !password) {
      return NextResponse.redirect(
        new URL("/signup?error=missing", req.url),
        303
      );
    }

    const supabase = supabaseServer(cookies());

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    } as any);

    if (error) {
      console.error("Signup error", error);
      return NextResponse.redirect(
        new URL(`/signup?error=${encodeURIComponent(error.message)}`, req.url),
        303
      );
    }

    // Redirect to login with a success message (Supabase may send confirmation email)
    return NextResponse.redirect(new URL(`/login?info=signup`, req.url), 303);
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(
      new URL("/signup?error=internal", req.url),
      303
    );
  }
}
