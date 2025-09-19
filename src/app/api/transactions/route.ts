import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.env.DEV_USER_ID;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Missing SUPABASE env vars" },
      { status: 500 }
    );
  }
  if (!userId) {
    return NextResponse.json(
      { error: "DEV_USER_ID is required" },
      { status: 400 }
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const body = await req.json();
    const { account_id, category_id, subcategory_id, amount, description } =
      body;

    // Validate required fields
    if (!account_id || !category_id || !amount) {
      return NextResponse.json(
        { error: "account_id, category_id, and amount are required" },
        { status: 400 }
      );
    }

    // Get category name from category_id
    const { data: categoryData, error: categoryError } = await supabase
      .from("user_categories")
      .select("name")
      .eq("id", category_id)
      .eq("user_id", userId)
      .single();

    if (categoryError) {
      console.error("Error fetching category:", categoryError);
      return NextResponse.json(
        { error: "Invalid category_id" },
        { status: 400 }
      );
    }

    // Get subcategory name if provided
    let subcategoryName = "";
    if (subcategory_id) {
      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from("user_categories")
        .select("name")
        .eq("id", subcategory_id)
        .eq("user_id", userId)
        .single();

      if (subcategoryError) {
        console.error("Error fetching subcategory:", subcategoryError);
        return NextResponse.json(
          { error: "Invalid subcategory_id" },
          { status: 400 }
        );
      }
      subcategoryName = subcategoryData.name;
    }

    // Create transaction
    const transactionData = {
      user_id: userId,
      date: new Date().toISOString().split("T")[0], // Current date in YYYY-MM-DD format
      category: categoryData.name,
      subcategory: subcategoryName,
      amount: parseFloat(amount),
      description: description || "",
      account_id: account_id,
      // inserted_at is handled by the database default
    };

    console.log("[/api/transactions] Creating transaction:", transactionData);

    const { data, error } = await supabase
      .from("transactions")
      .insert(transactionData)
      .select()
      .single();

    if (error) {
      console.error("Error creating transaction:", error);
      return NextResponse.json(
        { error: "Failed to create transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Failed to create transaction:", err);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
