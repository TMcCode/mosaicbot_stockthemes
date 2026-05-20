/**
 * Absolute OAuth / magic-link callback URL including Next `basePath` (GitHub Pages).
 * Call from the browser only (after magic link submission).
 */

export function authCallbackAbsoluteUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/$/, "");
  const path = `${bp}/auth/callback`.replace(/\/{2,}/g, "/");
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}
