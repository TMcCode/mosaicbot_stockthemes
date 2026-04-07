"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  minHeight?: number;
  rootMargin?: string;
};

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
    if (typeof IntersectionObserver === "undefined") return;
    let cancelled = false;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!cancelled) setReady(true);
        obs.disconnect();
      },
      { root: null, rootMargin, threshold: 0.01 },
    );
    obs.observe(node);
    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [ready, rootMargin]);

  return (
    <div ref={hostRef}>
      {ready ? children : <div aria-hidden="true" style={{ minHeight }} />}
    </div>
  );
}
