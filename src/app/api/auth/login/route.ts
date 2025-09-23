import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Support both form submissions and JSON fetches
    let username: string | undefined;
    let password: string | undefined;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = (await req.json()) as {
        username?: string;
        password?: string;
      };
      username = body.username;
      password = body.password;
    } else {
      const form = await req.formData();
      username = form.get("username") as string | undefined;
      password = form.get("password") as string | undefined;
    }

    if (!username || !password) {
      // Redirect back to login with error
      return NextResponse.redirect(
        new URL("/login?error=missing", req.url),
        303
      );
    }

    const supabase = await supabaseServer(await cookies());

    // Use Supabase server client to sign in and set cookies
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    } as any);

    if (error) {
      console.error("Supabase sign-in error", error);
      return NextResponse.redirect(
        new URL("/login?error=invalid", req.url),
        303
      );
    }

    // On success the @supabase/ssr client will have set cookies; redirect to /expense
    return NextResponse.redirect(new URL("/expense", req.url), 303);
  } catch (err) {
    console.error("Login error", err);
    return NextResponse.redirect(
      new URL("/login?error=internal", req.url),
      303
    );
  }
}
