import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Route/Server Action safe client: allows setting cookies (for API routes)
export async function supabaseServer(
  store?: Awaited<ReturnType<typeof cookies>>
) {
  const storeLocal = store ?? (await cookies());
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const c = (storeLocal as any).get?.(name);
          return c?.value ?? undefined;
        },
        set(name: string, value: string, options?: any) {
          // In Route Handlers/Server Actions, Next allows cookie mutation
          (storeLocal as any).set?.(name, value, options ?? {});
        },
        remove(name: string, options?: any) {
          (storeLocal as any).set?.(name, "", {
            ...(options ?? {}),
            maxAge: 0,
          });
        },
      },
    }
  );
}

// Server Component safe client: read-only cookies, no persistence to avoid Next cookies mutation errors
export async function supabaseServerRSC() {
  const storeLocal = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const c = (storeLocal as any).get?.(name);
          return c?.value ?? undefined;
        },
        set() {
          // no-op: Next disallows cookie mutation in RSC; avoid hydration errors
        },
        remove() {
          // no-op in RSC
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
