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
  /**
   * Above-fold strips (home feed, radar): skip idle + viewport deferral so
   * CDN logos start immediately. Still uses presence index when ``logoUrl``
   * is absent; falls back to a png guess while the index loads.
   */
  priority?: boolean;
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
 * Fixed 16×16 slot. By default defers network until idle + near-viewport;
 * uses presence index to avoid 404s when ``logo_url`` is absent from theme JSON.
 */
export function ConstituentLogo({ ticker, logoUrl, priority = false }: Props) {
  const slotRef = useRef<HTMLSpanElement | null>(null);
  const [presence, setPresence] = useState<LogoPresenceMap | null | undefined>(undefined);
  const [allowFetch, setAllowFetch] = useState(priority);
  /** Bumps on img error so we re-resolve against ``failedSrc``. */
  const [, setFailedTick] = useState(0);

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
    if (priority) {
      setAllowFetch(true);
      return;
    }
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
  }, [priority]);

  const resolved = resolveConstituentLogoUrl(logoUrl, ticker, presence);
  const srcCandidate =
    resolved && !failedSrc.has(resolved)
      ? resolved
      : (() => {
          if (!resolved) return null;
          const alt = alternateLogoUrl(resolved);
          return alt && !failedSrc.has(alt) ? alt : null;
        })();
  const src = allowFetch && srcCandidate ? srcCandidate : null;

  return (
    <span ref={slotRef} className={styles.constituentLogoSlot} aria-hidden>
      {src ? (
        <img
          key={src}
          src={src}
          alt=""
          width={16}
          height={16}
          className={styles.constituentLogo}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          // Avoid CDN edge rules that treat some Chrome referrers harshly.
          referrerPolicy="no-referrer"
          fetchPriority={priority ? "high" : "low"}
          onError={() => {
            failedSrc.add(src);
            setFailedTick((n) => n + 1);
          }}
        />
      ) : null}
    </span>
  );
}

function alternateLogoUrl(failedUrl: string): string | null {
  const u = String(failedUrl || "").trim();
  if (!u) return null;
  if (/\.png$/i.test(u)) return u.replace(/\.png$/i, ".jpeg");
  if (/\.jpe?g$/i.test(u)) return u.replace(/\.jpe?g$/i, ".png");
  return null;
}
