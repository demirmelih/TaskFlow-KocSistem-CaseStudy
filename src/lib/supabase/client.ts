"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client. Used inside Client Components and hooks.
// The anon key is public by design — RLS protects the data.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
