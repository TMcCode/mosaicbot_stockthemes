import Script from "next/script";

/**
 * One copy of Google’s AdSense loader sitewide (the “AdSense code” / `adsbygoogle.js?client=ca-pub-…`).
 * Same URL as Google’s “global snippet”; `beforeInteractive` loads from the root layout as early as Next allows
 * (closest App Router equivalent to pasting the script in &lt;head&gt;).
 * Per-unit &lt;ins&gt; blocks live in {@link AdPlacement}.
 */
export function AdSenseGlobalScript() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  if (!client || !/^ca-pub-\d+$/i.test(client)) {
    return null;
  }
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  return <Script async src={src} crossOrigin="anonymous" strategy="beforeInteractive" />;
}
