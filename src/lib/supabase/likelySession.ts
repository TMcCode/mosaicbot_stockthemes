import { getSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * True when localStorage looks like it has a Supabase session for this project.
 * Used only as an optimistic UI hint before `getSession()` resolves — not auth.
 */
export function readLikelySupabaseSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cfg = getSupabasePublicConfig();
    if (!cfg) return false;

    const keys: string[] = [];
    try {
      const host = new URL(cfg.url).hostname;
      const ref = host.split(".")[0]?.trim();
      if (ref) keys.push(`sb-${ref}-auth-token`);
    } catch {
      /* ignore bad url */
    }

    for (const key of keys) {
      if (storageLooksLikeSession(localStorage.getItem(key))) return true;
    }

    // Fallback: any sb-*-auth-token with a token (custom storage key / older clients).
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !/^sb-.*-auth-token$/i.test(key)) continue;
      if (storageLooksLikeSession(localStorage.getItem(key))) return true;
    }
  } catch {
    return false;
  }
  return false;
}

function storageLooksLikeSession(raw: string | null): boolean {
  if (!raw || raw.length < 20) return false;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.access_token === "string" && parsed.access_token.length > 0) return true;
    const current = parsed.currentSession;
    if (current && typeof current === "object") {
      const token = (current as { access_token?: unknown }).access_token;
      if (typeof token === "string" && token.length > 0) return true;
    }
    // supabase-js sometimes wraps under `session`
    const session = parsed.session;
    if (session && typeof session === "object") {
      const token = (session as { access_token?: unknown }).access_token;
      if (typeof token === "string" && token.length > 0) return true;
    }
  } catch {
    // Non-JSON but non-empty — treat as present only if it looks JWT-ish
    return raw.includes("eyJ");
  }
  return false;
}
