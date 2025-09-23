import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const supabase = await supabaseServer(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("transaction_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(_req: NextRequest) {
  const supabase = await supabaseServer(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await _req.json();
  const { name, account_id, category_id, subcategory_id, amount, description } =
    body;
  if (!name || amount === undefined || amount === null)
    return NextResponse.json(
      { error: "Name and amount are required" },
      { status: 400 }
    );
  const amountNum = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(amountNum)) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  // Optional but helpful validation to avoid RLS failures: ensure referenced records belong to the user
  try {
    if (account_id) {
      const { data: acc, error: accErr } = await supabase
        .from("accounts")
        .select("id")
        .eq("id", account_id)
        .eq("user_id", user.id)
        .single();
      if (accErr || !acc) {
        return NextResponse.json(
          { error: "Invalid account_id" },
          { status: 400 }
        );
      }
    }
    if (category_id) {
      const { data: cat, error: catErr } = await supabase
        .from("user_categories")
        .select("id")
        .eq("id", category_id)
        .eq("user_id", user.id)
        .single();
      if (catErr || !cat) {
        return NextResponse.json(
          { error: "Invalid category_id" },
          { status: 400 }
        );
      }
    }
    if (subcategory_id) {
      const { data: sub, error: subErr } = await supabase
        .from("user_categories")
        .select("id")
        .eq("id", subcategory_id)
        .eq("user_id", user.id)
        .single();
      if (subErr || !sub) {
        return NextResponse.json(
          { error: "Invalid subcategory_id" },
          { status: 400 }
        );
      }
    }
  } catch (e) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("transaction_templates")
    .insert({
      user_id: user.id,
      name,
      account_id,
      category_id,
      subcategory_id,
      amount: amountNum,
      description: description || null,
    })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(_req: NextRequest) {
  const supabase = await supabaseServer(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await _req.json();
  const { id, ...fields } = body;
  if (!id)
    return NextResponse.json(
      { error: "Template id is required" },
      { status: 400 }
    );
  // Normalize amount if provided as a string
  const updateFields: Record<string, any> = { ...fields };
  if (Object.prototype.hasOwnProperty.call(updateFields, "amount")) {
    const a = updateFields.amount;
    const amountNum = typeof a === "number" ? a : Number(a);
    if (!Number.isFinite(amountNum)) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    updateFields.amount = amountNum;
  }
  // Validate updated foreign keys if provided
  try {
    if (
      Object.prototype.hasOwnProperty.call(updateFields, "account_id") &&
      updateFields.account_id
    ) {
      const { data: acc, error: accErr } = await supabase
        .from("accounts")
        .select("id")
        .eq("id", updateFields.account_id)
        .eq("user_id", user.id)
        .single();
      if (accErr || !acc) {
        return NextResponse.json(
          { error: "Invalid account_id" },
          { status: 400 }
        );
      }
    }
    if (
      Object.prototype.hasOwnProperty.call(updateFields, "category_id") &&
      updateFields.category_id
    ) {
      const { data: cat, error: catErr } = await supabase
        .from("user_categories")
        .select("id")
        .eq("id", updateFields.category_id)
        .eq("user_id", user.id)
        .single();
      if (catErr || !cat) {
        return NextResponse.json(
          { error: "Invalid category_id" },
          { status: 400 }
        );
      }
    }
    if (
      Object.prototype.hasOwnProperty.call(updateFields, "subcategory_id") &&
      updateFields.subcategory_id
    ) {
      const { data: sub, error: subErr } = await supabase
        .from("user_categories")
        .select("id")
        .eq("id", updateFields.subcategory_id)
        .eq("user_id", user.id)
        .single();
      if (subErr || !sub) {
        return NextResponse.json(
          { error: "Invalid subcategory_id" },
          { status: 400 }
        );
      }
    }
  } catch (e) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("transaction_templates")
    .update(updateFields)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest) {
  const supabase = await supabaseServer(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await _req.json();
  const { id } = body;
  if (!id)
    return NextResponse.json(
      { error: "Template id is required" },
      { status: 400 }
    );
  const { error } = await supabase
    .from("transaction_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
