import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Accept an optional cookies store so callers (like app routes) can pass
// the request/response cookie store and allow Supabase SSR client to set
// and delete cookies when signing in/out.
export function supabaseServer(store?: ReturnType<typeof cookies>) {
  const storeLocal = store ?? cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Use getAll/setAll methods which are compatible with the newer
      // @supabase/ssr expectations. We forward to Next's cookies store when
      // possible. In server components `cookies()` is read-only; in route
      // handlers it supports set/delete — forwarding is a best-effort.
      cookies: {
        async getAll() {
          try {
            const resolved = await storeLocal;
            // RequestCookies has getAll() in Next; fallback to empty.
            const all =
              typeof (resolved as any).getAll === "function"
                ? (resolved as any).getAll()
                : [];
            return all.map((c: any) => ({ name: c.name, value: c.value }));
          } catch (e) {
            return [];
          }
        },
        async setAll(
          items: Array<{ name: string; value: string; options?: any }>
        ) {
          try {
            const resolved = await storeLocal;
            if (typeof (resolved as any).set === "function") {
              // If the store exposes a set method (route handlers), use it for each cookie
              for (const it of items) {
                (resolved as any).set(it.name, it.value, it.options ?? {});
              }
            }
          } catch (e) {
            // ignore
          }
        },
      },
    }
  );
}
