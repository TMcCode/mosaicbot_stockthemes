"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./AdPlacement.module.css";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export type AdPlacementId =
  | "hero"
  | "homeDiscoveryMid"
  | "themeChartEnd"
  | "themeRail"
  | "groupRail"
  | "groupStrip"
  | "groupsIndexRail"
  | "groupsIndexStrip"
  | "themesIndexRail"
  | "themesIndexStrip";

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();

function slotFor(placement: AdPlacementId): string | undefined {
  switch (placement) {
    case "hero":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_HERO?.trim();
    case "homeDiscoveryMid":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_DISCOVERY_MID?.trim();
    case "themeChartEnd":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_THEME_CHART_END?.trim();
    case "themeRail":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_THEME_RAIL?.trim();
    case "groupRail":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_GROUP_RAIL?.trim();
    case "groupStrip":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_GROUP_STRIP?.trim();
    case "groupsIndexRail":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_GROUPS_INDEX_RAIL?.trim();
    case "groupsIndexStrip":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_GROUPS_INDEX_STRIP?.trim();
    case "themesIndexRail":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_THEMES_INDEX_RAIL?.trim();
    case "themesIndexStrip":
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_THEMES_INDEX_STRIP?.trim();
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
 * Without them, shows the dashed placeholder. Global `adsbygoogle.js` is loaded in root layout via AdSenseGlobalScript.
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
  const hostRef = useRef<HTMLElement | null>(null);
  const pushedRef = useRef(false);
  const [shouldRequest, setShouldRequest] = useState(
    () => typeof window !== "undefined" && typeof IntersectionObserver === "undefined",
  );
  const shellClass = active ? (classNameWhenActive ?? className) : className;

  useEffect(() => {
    if (!active) return;
    const node = hostRef.current;
    if (!node) return;
    // Progressive loading: request ads only when near viewport.
    if (typeof IntersectionObserver === "undefined") return;
    let cancelled = false;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) return;
        if (!cancelled) setShouldRequest(true);
        obs.disconnect();
      },
      { root: null, rootMargin: "300px 0px", threshold: 0.01 },
    );
    obs.observe(node);
    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [active]);

  useEffect(() => {
    if (!active || !shouldRequest || pushedRef.current) return;
    pushedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      pushedRef.current = false;
    }
  }, [active, shouldRequest]);

  if (!active) {
    return <aside className={shellClass}>{placeholderLabel}</aside>;
  }

  return (
    <aside
      ref={(el) => {
        hostRef.current = el;
      }}
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
  );
}
