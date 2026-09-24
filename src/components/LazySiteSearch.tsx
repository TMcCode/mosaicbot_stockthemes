"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import styles from "./SiteSearch.module.css";

type LazySiteSearchProps = {
  placeholder?: string;
  variant?: "nav" | "hero";
};

const SiteSearchDynamic = dynamic(
  () => import("@/components/SiteSearch").then((m) => m.SiteSearch),
  { ssr: false },
);

export function LazySiteSearch({
  placeholder = "Search ticker, company, or theme…",
  variant = "nav",
}: LazySiteSearchProps = {}) {
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
    return <SiteSearchDynamic placeholder={placeholder} variant={variant} />;
  }

  if (active) {
    return <SiteSearchDynamic placeholder={placeholder} variant={variant} />;
  }

  const wrapClass = variant === "hero" ? `${styles.wrap} ${styles.wrapHero}` : styles.wrap;
  const inputClass = variant === "hero" ? `${styles.input} ${styles.inputHero}` : styles.input;

  return (
    <div className={wrapClass}>
      <input
        className={inputClass}
        type="search"
        placeholder={placeholder}
        readOnly
        onFocus={() => setActive(true)}
        onPointerDown={() => setActive(true)}
        onMouseEnter={() => setActive(true)}
        aria-label="Open search"
      />
    </div>
  );
}
