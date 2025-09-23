import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const code = body.code?.toUpperCase().trim();
  if (!code || code.length < 4)
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  // Use an RPC with SECURITY DEFINER to atomically claim the code server-side
  const { data, error } = await supabase.rpc("claim_household_code", {
    p_code: code,
  });
  if (error) {
    const msg = error.message || "RPC error";
    if (
      /claim_household_code/i.test(msg) &&
      /not find the function|schema cache|undefined/i.test(msg)
    ) {
      // Fallback with service role if configured
      const fallback = await tryServiceRoleClaim({
        code,
        userId: user.id,
        userEmail: user.email ?? null,
      });
      if (fallback.ok) {
        await supabase
          .from("user_onboarding")
          .upsert(
            { user_id: user.id, account_type: "household", completed: true },
            { onConflict: "user_id" }
          );
        return NextResponse.json({ ok: true });
      }
      if (fallback.status === 503)
        return NextResponse.json({ error: fallback.reason }, { status: 503 });
      return NextResponse.json(
        { error: fallback.reason },
        { status: fallback.status }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  if (!data?.ok) {
    const reason = (data as any)?.reason ?? "Code not found or inactive";
    const status = reason === "already_used" ? 409 : 404;
    // Attempt service role fallback as well
    const fallback = await tryServiceRoleClaim({
      code,
      userId: user.id,
      userEmail: user.email ?? null,
    });
    if (fallback.ok) {
      await supabase
        .from("user_onboarding")
        .upsert(
          { user_id: user.id, account_type: "household", completed: true },
          { onConflict: "user_id" }
        );
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: fallback.reason ?? reason },
      { status: fallback.status ?? status }
    );
  }
  // RPC succeeded, finalize onboarding for the partner
  await supabase
    .from("user_onboarding")
    .upsert(
      { user_id: user.id, account_type: "household", completed: true },
      { onConflict: "user_id" }
    );
  return NextResponse.json({ ok: true });
}

async function tryServiceRoleClaim({
  code,
  userId,
  userEmail,
}: {
  code: string;
  userId: string;
  userEmail: string | null;
}): Promise<{ ok: boolean; status: number; reason?: string }> {
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!svcKey || !url)
    return {
      ok: false,
      status: 503,
      reason:
        "Missing RPC claim_household_code. Please run docs/supabase_household_rls.sql in your Supabase project, then retry.",
    };
  const svc = createClient(url, svcKey);
  const { data: link, error } = await svc
    .from("household_links")
    .select("id, owner_user_id, partner_user_id, active")
    .eq("code", code)
    .maybeSingle();
  if (error) return { ok: false, status: 500, reason: error.message };
  if (!link || !link.active)
    return { ok: false, status: 404, reason: "Code not found or inactive" };
  if (link.owner_user_id === userId)
    return { ok: false, status: 400, reason: "You can't claim your own code" };
  if (link.partner_user_id)
    return { ok: false, status: 409, reason: "Code already used" };
  const { error: updErr } = await svc
    .from("household_links")
    .update({ partner_user_id: userId, partner_email: userEmail })
    .eq("id", link.id);
  if (updErr) return { ok: false, status: 500, reason: updErr.message };
  return { ok: true, status: 200 };
}
