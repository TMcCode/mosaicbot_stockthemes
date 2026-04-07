"use client";

import { useEffect } from "react";

/**
 * One copy of Google’s AdSense loader sitewide (the “AdSense code” / `adsbygoogle.js?client=ca-pub-…`).
 * Same URL as Google’s “global snippet”; we intentionally use `afterInteractive`
 * to keep first paint and hydration focused on core content.
 * Per-unit &lt;ins&gt; blocks live in {@link AdPlacement}.
 */
export function AdSenseGlobalScript() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  const validClient = Boolean(client && /^ca-pub-\d+$/i.test(client));
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client || "")}`;

  useEffect(() => {
    if (!validClient) return;
    if (document.querySelector('script[data-st-adsense="1"]')) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-st-adsense", "1");
    document.head.appendChild(script);
  }, [src, validClient]);

  return null;
}
