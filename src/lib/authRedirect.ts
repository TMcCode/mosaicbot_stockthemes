/**
 * Absolute OAuth / magic-link callback URL including Next `basePath` (GitHub Pages).
 * Call from the browser only (after magic link submission).
 */

/** Where to send users after sign-in when no `?next=` path is provided. */
export const AUTH_DEFAULT_NEXT_PATH = "/";

export function sanitizeAuthNextPath(raw: string | null | undefined): string | null {
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes(":") ||
    raw.length > 256
  ) {
    return null;
  }
  return raw;
}

export function resolveAuthNextPath(raw: string | null | undefined): string {
  return sanitizeAuthNextPath(raw) ?? AUTH_DEFAULT_NEXT_PATH;
}

export function authCallbackAbsoluteUrl(nextPath?: string | null): string {
  if (typeof window === "undefined") {
    return "";
  }
  const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/$/, "");
  const path = `${bp}/auth/callback`.replace(/\/{2,}/g, "/");
  const base = `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  const next = sanitizeAuthNextPath(nextPath);
  if (!next) {
    return base;
  }
  return `${base}?next=${encodeURIComponent(next)}`;
}
