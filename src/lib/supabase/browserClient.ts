import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

let singleton: SupabaseClient | null = null;

/**
 * Singleton browser client — reuse across components to avoid duplicate auth listeners.
 *
 * Uses default localStorage (not `@supabase/ssr` cookies). OAuth leaves the site for
 * Google/GitHub; Safari ITP often drops PKCE verifier cookies on return while
 * same-origin localStorage survives. Static export has no SSR auth, so cookies are
 * unnecessary.
 *
 * Relies on supabase-js ≥2.112 lockless auth coordination (no `navigator.locks`).
 * Older clients deadlocked on React Strict Mode / HMR and left `/auth/callback`
 * stuck on "Finishing sign-in…".
 *
 * Returns null when env is not configured (builds/locales without secrets).
 */
export function getBrowserSupabase(): SupabaseClient | null {
  const cfg = getSupabasePublicConfig();
  if (!cfg) {
    return null;
  }
  if (!singleton) {
    singleton = createClient(cfg.url, cfg.anonKey, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return singleton;
}
