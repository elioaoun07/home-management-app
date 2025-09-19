import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("Missing NEXT_SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}
