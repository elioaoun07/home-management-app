import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function generateCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoid confusing chars
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function GET() {
  const supabase = await supabaseServer(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: onboarding, error } = await supabase
    .from("user_onboarding")
    .select("account_type, completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // If user chose household, try to fetch existing code for display convenience
  let household: any = null;
  if (onboarding?.account_type === "household") {
    const { data: link } = await supabase
      .from("household_links")
      .select(
        "code, owner_user_id, partner_user_id, partner_email, owner_email, active"
      )
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    household = link ?? null;
  }

  return NextResponse.json({
    account_type: onboarding?.account_type ?? null,
    completed: onboarding?.completed ?? false,
    household,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    account_type?: "individual" | "household";
  };
  const account_type = body.account_type;
  if (account_type !== "individual" && account_type !== "household") {
    return NextResponse.json(
      { error: "Invalid account_type" },
      { status: 400 }
    );
  }

  // Upsert onboarding record and mark completed once user decides
  const { error: upsertErr } = await supabase
    .from("user_onboarding")
    .upsert(
      { user_id: user.id, account_type, completed: true },
      { onConflict: "user_id" }
    );
  if (upsertErr)
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  // If household, ensure a code exists (create if none active)
  if (account_type === "household") {
    // If user is already linked as a partner to someone else's household, don't create a new owner row
    const { data: partnerLink } = await supabase
      .from("household_links")
      .select("id, code, owner_user_id, active")
      .eq("partner_user_id", user.id)
      .eq("active", true)
      .maybeSingle();
    if (partnerLink) {
      return NextResponse.json({
        ok: true,
        code: partnerLink.code,
        alreadyLinkedAsPartner: true,
      });
    }

    // Otherwise, check for existing active code where this user is the owner
    const { data: existing } = await supabase
      .from("household_links")
      .select("id, code, active, partner_user_id")
      .eq("owner_user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (existing && existing.partner_user_id) {
      // Already linked; just return basic info
      return NextResponse.json({
        ok: true,
        code: existing.code,
        alreadyLinked: true,
      });
    }

    let code = existing?.code as string | undefined;
    if (!code) {
      // try generating a unique code (a few attempts)
      let attempts = 0;
      while (attempts < 5) {
        const candidate = generateCode(6);
        const { data: dup } = await supabase
          .from("household_links")
          .select("id")
          .eq("code", candidate)
          .maybeSingle();
        if (!dup) {
          code = candidate;
          break;
        }
        attempts++;
      }
      if (!code) code = generateCode(8);

      const owner_email = user.email ?? null;
      const { error: insErr } = await supabase.from("household_links").insert({
        code,
        owner_user_id: user.id,
        owner_email,
        active: true,
      });
      if (insErr)
        return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, code });
  }

  // Individual
  return NextResponse.json({ ok: true });
}
