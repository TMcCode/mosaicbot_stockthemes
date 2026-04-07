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
  const adsEnabled =
    process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_ADS_IN_DEV === "true";
  const validClient = Boolean(client && /^ca-pub-\d+$/i.test(client));
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client || "")}`;
  const scriptId = "st-adsense-loader";

  useEffect(() => {
    if (!adsEnabled) return;
    if (!validClient) return;
    if (document.getElementById(scriptId)) return;
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = src;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, [adsEnabled, scriptId, src, validClient]);

  return null;
}
