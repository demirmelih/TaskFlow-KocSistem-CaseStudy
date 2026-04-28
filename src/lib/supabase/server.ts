import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Supabase client. Used in Server Components, Route Handlers, and
// Server Actions. Reads/writes auth cookies via Next's cookies() store.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) {
          // In Server Components, cookies are read-only — Supabase will call
          // setAll during session refresh, which can fail silently here. The
          // middleware (lib/supabase/middleware.ts) is the authoritative
          // place where session cookies actually get refreshed.
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Ignored: invoked from a Server Component where set is a no-op.
          }
        },
      },
    },
  );
}
