"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

import styles from "./AdPlacement.module.css";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export type AdPlacementId = "hero" | "themeRail" | "groupRail" | "groupStrip";

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();

function slotFor(placement: AdPlacementId): string | undefined {
  switch (placement) {
    case "hero":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_HERO?.trim();
    case "themeRail":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_THEME_RAIL?.trim();
    case "groupRail":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_GROUP_RAIL?.trim();
    case "groupStrip":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_GROUP_STRIP?.trim();
    default:
      return undefined;
  }
}

type Props = {
  placement: AdPlacementId;
  /** Pass `page.module.css` ad slot classes from the page. */
  className: string;
  /** When ads are on, use this instead of `className` (e.g. taller horizontal strip). */
  classNameWhenActive?: string;
  placeholderLabel: string;
  /** `horizontal` fits the group footer strip; default is responsive display. */
  format?: "auto" | "horizontal";
};

/**
 * Google AdSense display units. Set `NEXT_PUBLIC_ADSENSE_CLIENT` (ca-pub-…) and per-slot env vars.
 * Without them, shows the dashed placeholder. Add `public/ads.txt` on the apex domain before going live.
 */
export function AdPlacement({
  placement,
  className,
  classNameWhenActive,
  placeholderLabel,
  format = "auto",
}: Props) {
  const slotId = slotFor(placement);
  const active = Boolean(AD_CLIENT && slotId);
  const pushedRef = useRef(false);
  const shellClass = active ? (classNameWhenActive ?? className) : className;

  useEffect(() => {
    if (!active || pushedRef.current) return;
    pushedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      pushedRef.current = false;
    }
  }, [active]);

  if (!active) {
    return <aside className={shellClass}>{placeholderLabel}</aside>;
  }

  const scriptSrc = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(AD_CLIENT!)}`;

  return (
    <>
      <Script async src={scriptSrc} crossOrigin="anonymous" strategy="lazyOnload" />
      <aside
        className={`${shellClass} ${styles.live}`}
        data-ad-placement={placement}
        aria-label="Advertisement"
      >
        <ins
          className={`adsbygoogle ${styles.ins}`}
          style={{ display: "block" }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={slotId}
          data-ad-format={format === "horizontal" ? "horizontal" : "auto"}
          data-full-width-responsive={format === "horizontal" ? "false" : "true"}
        />
      </aside>
    </>
  );
}
