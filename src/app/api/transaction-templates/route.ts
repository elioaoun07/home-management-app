import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE env vars");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
};

export async function GET(req: NextRequest) {
  const userId = process.env.DEV_USER_ID;
  if (!userId)
    return NextResponse.json(
      { error: "DEV_USER_ID is required" },
      { status: 400 }
    );
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("transaction_templates")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const userId = process.env.DEV_USER_ID;
  if (!userId)
    return NextResponse.json(
      { error: "DEV_USER_ID is required" },
      { status: 400 }
    );
  const supabase = getSupabase();
  const body = await req.json();
  const { name, account_id, category_id, subcategory_id, amount, description } =
    body;
  if (!name || !amount)
    return NextResponse.json(
      { error: "Name and amount are required" },
      { status: 400 }
    );
  const { data, error } = await supabase
    .from("transaction_templates")
    .insert({
      user_id: userId,
      name,
      account_id,
      category_id,
      subcategory_id,
      amount,
      description: description || null,
    })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const userId = process.env.DEV_USER_ID;
  if (!userId)
    return NextResponse.json(
      { error: "DEV_USER_ID is required" },
      { status: 400 }
    );
  const supabase = getSupabase();
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id)
    return NextResponse.json(
      { error: "Template id is required" },
      { status: 400 }
    );
  const { data, error } = await supabase
    .from("transaction_templates")
    .update(fields)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const userId = process.env.DEV_USER_ID;
  if (!userId)
    return NextResponse.json(
      { error: "DEV_USER_ID is required" },
      { status: 400 }
    );
  const supabase = getSupabase();
  const body = await req.json();
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
    .eq("user_id", userId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
