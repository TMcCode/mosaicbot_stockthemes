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

/** Paths that should not be used as post-sign-in return targets. */
function isAuthSurfacePath(path: string): boolean {
  const pathOnly = path.split("?")[0] || path;
  return pathOnly === "/sign-in" || pathOnly === "/auth/callback" || pathOnly.startsWith("/auth/");
}

/**
 * Build `/sign-in?next=…` from a same-origin app path (pathname + optional search).
 * Safe for nav CTAs — no network, no Suspense.
 */
export function buildSignInHref(returnPath?: string | null): string {
  const next = sanitizeAuthNextPath(returnPath);
  if (!next || isAuthSurfacePath(next)) {
    return "/sign-in";
  }
  return `/sign-in?next=${encodeURIComponent(next)}`;
}

/** App path including Next `basePath` (GitHub Pages). Browser-only. */
export function authAppPath(path: string): string {
  const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/$/, "");
  const prefix = !bp ? "" : bp.startsWith("/") ? bp : `/${bp}`;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${prefix}${p}`.replace(/\/{2,}/g, "/");
}

/** Full-page redirect after OAuth/magic-link — reliable in Safari (soft router nav can stall). */
export function authHardRedirect(path: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.location.replace(`${window.location.origin}${authAppPath(path)}`);
}

export function authCallbackAbsoluteUrl(nextPath?: string | null): string {
  if (typeof window === "undefined") {
    return "";
  }
  const base = `${window.location.origin}${authAppPath("/auth/callback")}`;
  const next = sanitizeAuthNextPath(nextPath);
  if (!next) {
    return base;
  }
  return `${base}?next=${encodeURIComponent(next)}`;
}
