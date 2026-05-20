/**
 * Reads public Supabase config from NEXT_PUBLIC_* (browser + SSR bundle).
 */

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

/**
 * Cookie path for `@supabase/ssr` browser client. When the app is mounted under
 * Next `basePath` (GitHub Pages), align cookies with that path segment.
 */
export function getSupabaseBrowserCookiePath(): string {
  const raw = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/$/, "");
  if (!raw) {
    return "/";
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}
