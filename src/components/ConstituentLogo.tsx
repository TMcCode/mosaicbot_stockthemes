"use client";

import { useEffect, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import {
  loadLogoPresenceMap,
  resolveConstituentLogoUrl,
  type LogoPresenceMap,
} from "@/lib/constituentLogoUrl";

type Props = {
  ticker: string;
  logoUrl?: string | null;
};

const failedSrc = new Set<string>();

function scheduleIdle(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const ric = window.requestIdleCallback?.bind(window);
  if (ric) {
    const id = ric(() => cb(), { timeout: 1200 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 200);
  return () => window.clearTimeout(id);
}

/**
 * Fixed 16×16 slot. Defers network until idle + near-viewport; uses presence
 * index to avoid 404s when ``logo_url`` is absent from theme JSON.
 */
export function ConstituentLogo({ ticker, logoUrl }: Props) {
  const slotRef = useRef<HTMLSpanElement | null>(null);
  const [presence, setPresence] = useState<LogoPresenceMap | null | undefined>(undefined);
  const [allowFetch, setAllowFetch] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadLogoPresenceMap().then((map) => {
      if (!cancelled) setPresence(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = slotRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      return scheduleIdle(() => setAllowFetch(true));
    }
    let cancelIdle: (() => void) | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        cancelIdle = scheduleIdle(() => setAllowFetch(true));
      },
      { rootMargin: "160px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelIdle?.();
    };
  }, []);

  const resolved = resolveConstituentLogoUrl(logoUrl, ticker, presence);
  const src =
    allowFetch && resolved && !failed && !failedSrc.has(resolved) ? resolved : null;

  return (
    <span ref={slotRef} className={styles.constituentLogoSlot} aria-hidden>
      {src ? (
        <img
          src={src}
          alt=""
          width={16}
          height={16}
          className={styles.constituentLogo}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          onError={() => {
            failedSrc.add(src);
            setFailed(true);
          }}
        />
      ) : null}
    </span>
  );
}
