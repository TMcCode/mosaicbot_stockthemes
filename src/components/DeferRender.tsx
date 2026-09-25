"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./DeferRender.module.css";

type Props = {
  children: React.ReactNode;
  minHeight?: number;
  rootMargin?: string;
  /** Always mount after this many ms if IO never fires (CF / Safari edge cases). */
  fallbackMs?: number;
};

/** Parse the vertical component of an IntersectionObserver rootMargin (px or %). */
function rootMarginYPx(rootMargin: string, viewportH: number): number {
  const parts = rootMargin.trim().split(/\s+/);
  const raw = parts[0] ?? "0px";
  if (raw.endsWith("%")) {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? (n / 100) * viewportH : 0;
  }
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function nearViewport(node: HTMLElement, rootMargin: string): boolean {
  const vh = window.innerHeight || 0;
  const marginY = rootMarginYPx(rootMargin, vh);
  const rect = node.getBoundingClientRect();
  return rect.bottom >= -marginY && rect.top <= vh + marginY;
}

/**
 * Defers mounting heavier client UI until near viewport.
 * Keeps layout stable via a lightweight placeholder box.
 *
 * Includes an eager on-screen check, scroll/resize re-check, and a timeout
 * fallback — live CF Pages has left IntersectionObserver stuck before
 * (empty Motions sector/factor chart slot).
 */
export function DeferRender({
  children,
  minHeight = 360,
  rootMargin = "320px 0px",
  fallbackMs = 1800,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (ready) return;
    const node = hostRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setReady(true);
      return;
    }

    let cancelled = false;
    const reveal = () => {
      if (!cancelled) setReady(true);
    };

    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        reveal();
        obs.disconnect();
      },
      { root: null, rootMargin, threshold: 0 },
    );
    obs.observe(node);

    if (nearViewport(node, rootMargin)) {
      reveal();
      obs.disconnect();
    }

    const onScrollOrResize = () => {
      if (cancelled || !hostRef.current) return;
      if (nearViewport(hostRef.current, rootMargin)) {
        reveal();
        obs.disconnect();
      }
    };
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    const t = window.setTimeout(reveal, Math.max(400, fallbackMs));

    return () => {
      cancelled = true;
      obs.disconnect();
      window.clearTimeout(t);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [ready, rootMargin, fallbackMs]);

  return (
    <div ref={hostRef} className={styles.host}>
      {ready ? (
        children
      ) : (
        <div aria-hidden="true" className={styles.placeholder} style={{ minHeight }} />
      )}
    </div>
  );
}
