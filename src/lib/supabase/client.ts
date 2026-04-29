import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  if (process.env.NEXT_PUBLIC_PACE_DEMO_MODE === "1") {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createBrowserClient(url, anonKey);
}
