"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { SiteSearch } from "@/components/SiteSearch";
import styles from "./SiteSearch.module.css";

const SiteSearchDynamic = dynamic(
  () => import("@/components/SiteSearch").then((m) => m.SiteSearch),
  { ssr: false },
);

export function LazySiteSearch() {
  if (process.env.NODE_ENV !== "production") {
    return <SiteSearch />;
  }

  const [active, setActive] = useState(false);
  const idleHandleRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) return;
    const onIdle = () => setActive(true);
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleHandleRef.current = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(
        onIdle,
      );
    } else {
      timeoutRef.current = window.setTimeout(onIdle, 1500);
    }
    return () => {
      if (idleHandleRef.current != null && "cancelIdleCallback" in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleHandleRef.current);
      }
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [active]);

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

