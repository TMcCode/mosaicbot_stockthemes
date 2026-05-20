import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseBrowserCookiePath, getSupabasePublicConfig } from "@/lib/supabase/config";


import type { SupabaseClient } from "@supabase/supabase-js";

let singleton: SupabaseClient | null = null;

/**
 * Singleton browser client — reuse across components to avoid duplicate auth listeners.
 * Uses `@supabase/ssr` so PKCE (magic link) state lives in cookies, not localStorage; the
 * default `createClient` loses the code verifier across Next.js navigations and shows
 * "PKCE code verifier not found in storage".
 *
 * Returns null when env is not configured (builds/locales without secrets).
 */
export function getBrowserSupabase(): SupabaseClient | null {
  const cfg = getSupabasePublicConfig();
  if (!cfg) {
    return null;
  }
  if (!singleton) {
    singleton = createBrowserClient(cfg.url, cfg.anonKey, {
      cookieOptions: { path: getSupabaseBrowserCookiePath() },
    });
  }
  return singleton;
}
