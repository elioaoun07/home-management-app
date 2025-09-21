import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  // Use SSR client to access the authenticated user via cookies
  const supabase = supabaseServer(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await _req.json();
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
      .eq("user_id", user.id)
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
        .eq("user_id", user.id)
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
      user_id: user.id,
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

export async function PATCH(req: NextRequest) {
  const supabase = supabaseServer(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, date, amount, description, category_id, subcategory_id } =
      body || {};
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateFields: Record<string, any> = {};

    if (date !== undefined) {
      // Expect YYYY-MM-DD
      const d = typeof date === "string" ? date : String(date);
      // Quick validation: 10 chars and valid Date
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
      if (!valid) {
        return NextResponse.json(
          { error: "Invalid date format (expected YYYY-MM-DD)" },
          { status: 400 }
        );
      }
      updateFields.date = d;
    }

    if (amount !== undefined) {
      const num = typeof amount === "number" ? amount : Number(amount);
      if (!Number.isFinite(num)) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      updateFields.amount = num;
    }

    if (description !== undefined) {
      updateFields.description = description ?? "";
    }

    // Handle category/subcategory updates by resolving names. Accept both UUIDs and default seed IDs.
    const isUuid = (v: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
      );

    // Helper to resolve a category name by id which may be a UUID or a default seed id.
    const resolveCategoryName = async (idOrSeed: string) => {
      if (isUuid(idOrSeed)) {
        const { data, error } = await supabase
          .from("user_categories")
          .select("name")
          .eq("id", idOrSeed)
          .eq("user_id", user.id)
          .single();
        if (error || !data) return null;
        return data.name as string;
      }
      // For seed ids, attempt to find matching name from DEFAULT_ACCOUNTS
      try {
        const { DEFAULT_ACCOUNTS } = await import(
          "@/constants/defaultCategories"
        );
        for (const acc of DEFAULT_ACCOUNTS) {
          for (const cat of acc.categories) {
            if (cat.id === idOrSeed) return cat.name;
            for (const sub of cat.subcategories ?? []) {
              if (sub.id === idOrSeed) return sub.name;
            }
          }
        }
      } catch {}
      return null;
    };

    if (category_id !== undefined) {
      if (category_id === null || category_id === "") {
        updateFields.category = "";
        // When clearing category, also clear subcategory if not explicitly set
        if (subcategory_id === undefined) updateFields.subcategory = "";
      } else {
        const name = await resolveCategoryName(String(category_id));
        if (!name) {
          return NextResponse.json(
            { error: "Invalid category_id" },
            { status: 400 }
          );
        }
        updateFields.category = name;
        // If category changes and subcategory not provided, clear subcategory as it may no longer be valid
        if (subcategory_id === undefined) updateFields.subcategory = "";
      }
    }

    if (subcategory_id !== undefined) {
      if (subcategory_id === null || subcategory_id === "") {
        updateFields.subcategory = "";
      } else {
        const name = await resolveCategoryName(String(subcategory_id));
        if (!name) {
          return NextResponse.json(
            { error: "Invalid subcategory_id" },
            { status: 400 }
          );
        }
        updateFields.subcategory = name;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("transactions")
      .update(updateFields)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating transaction:", error);
      return NextResponse.json(
        { error: "Failed to update transaction" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("Failed to update transaction:", e);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}
