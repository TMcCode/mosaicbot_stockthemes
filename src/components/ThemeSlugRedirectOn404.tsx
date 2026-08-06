"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { STOCKTHEMES_CDN_ORIGIN } from "@/lib/stockthemesCdnOrigin";
import type { ThemeSlugRedirectsV0 } from "@/types/theme_slug_redirects.v0";

/**
 * On static 404 pages (GitHub Pages), resolve retired theme slugs from the live
 * CDN redirect map so renames work before the next Pages rebuild.
 */
export function ThemeSlugRedirectOn404() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const m = pathname.match(/^\/themes\/([^/]+)\/?$/);
    if (!m) return;
    const slug = decodeURIComponent(m[1] || "").trim();
    if (!slug) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${STOCKTHEMES_CDN_ORIGIN}/theme_slug_redirects.v0.json?ts=${Date.now()}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as ThemeSlugRedirectsV0;
        const next = String(data.redirects?.[slug] || "").trim();
        if (!next || next === slug || cancelled) return;
        setNote(`Redirecting to updated theme…`);
        router.replace(`/themes/${encodeURIComponent(next)}`);
      } catch {
        // Keep the static 404.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!note) return null;
  return <p className="text-muted" style={{ marginTop: "0.75rem" }}>{note}</p>;
}
