/** Public contact inboxes (Cloudflare Email Routing → operator Gmail). */

export const HELLO_EMAIL = "hello@stockthemes.ai";
export const SUPPORT_EMAIL = "support@stockthemes.ai";
export const THEME_IDEAS_EMAIL = "themeideas@stockthemes.ai";

export function mailtoHref(email: string, subject?: string): string {
  const base = `mailto:${email}`;
  if (!subject?.trim()) return base;
  return `${base}?subject=${encodeURIComponent(subject.trim())}`;
}
