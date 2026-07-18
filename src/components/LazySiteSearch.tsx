"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import styles from "./SiteSearch.module.css";

const SiteSearchDynamic = dynamic(
  () => import("@/components/SiteSearch").then((m) => m.SiteSearch),
  { ssr: false },
);

export function LazySiteSearch() {
  const isProd = process.env.NODE_ENV === "production";
  const [active, setActive] = useState(false);
  const idleHandleRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isProd || active) return;
    const onIdle = () => setActive(true);
    if (typeof requestIdleCallback === "function") {
      idleHandleRef.current = requestIdleCallback(onIdle);
    } else {
      timeoutRef.current = setTimeout(onIdle, 1500);
    }
    return () => {
      if (idleHandleRef.current != null && typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleHandleRef.current);
      }
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [active, isProd]);

  if (!isProd) {
    return <SiteSearchDynamic />;
  }

  if (active) return <SiteSearchDynamic />;

  return (
    <div className={styles.wrap}>
      <input
        className={styles.input}
        type="search"
        placeholder="Search ticker, theme, or group"
        readOnly
        onFocus={() => setActive(true)}
        onPointerDown={() => setActive(true)}
        onMouseEnter={() => setActive(true)}
        aria-label="Open search"
      />
    </div>
  );
}
