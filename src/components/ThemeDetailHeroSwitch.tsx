"use client";

import { useEffect, useState, type ReactNode } from "react";

import styles from "@/app/page.module.css";

const DESKTOP_MQ = "(min-width: 1101px)";

type Props = {
  desktop: ReactNode;
  mobile: ReactNode;
};

/**
 * Renders either the desktop or mobile theme hero — never both —
 * so Factor Profile / treemap are not double-mounted.
 */
export function ThemeDetailHeroSwitch({ desktop, mobile }: Props) {
  const [mode, setMode] = useState<"desktop" | "mobile" | "unknown">("unknown");

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const apply = () => setMode(mq.matches ? "desktop" : "mobile");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // SSR + first paint: desktop markup (GitHub layout). Mobile swaps after mount.
  if (mode === "mobile") {
    return <div className={styles.themeHeroMobileRoot}>{mobile}</div>;
  }
  return <div className={styles.themeHeroDesktopRoot}>{desktop}</div>;
}
