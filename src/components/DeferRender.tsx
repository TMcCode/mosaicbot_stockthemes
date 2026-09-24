"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./DeferRender.module.css";

type Props = {
  children: React.ReactNode;
  minHeight?: number;
  rootMargin?: string;
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

/**
 * Defers mounting heavier client UI until near viewport.
 * Keeps layout stable via a lightweight placeholder box.
 */
export function DeferRender({ children, minHeight = 360, rootMargin = "320px 0px" }: Props) {
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

    // Safari / some CF Pages loads never fire IO for nodes already on-screen.
    const vh = window.innerHeight || 0;
    const marginY = rootMarginYPx(rootMargin, vh);
    const rect = node.getBoundingClientRect();
    if (rect.bottom >= -marginY && rect.top <= vh + marginY) {
      reveal();
      obs.disconnect();
    }

    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [ready, rootMargin]);

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
