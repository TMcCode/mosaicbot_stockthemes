"use client";

import { useEffect } from "react";

import styles from "./SiteNav.module.css";

const NAV_SELECTOR = "header[data-site-nav]";
const DESKTOP_MQ = "(min-width: 601px)";

/** Reserves document space under fixed desktop nav; updates only on resize (ResizeObserver). */
export function SiteNavDesktopOffset() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(NAV_SELECTOR);
    if (!header) return;

    const mq = window.matchMedia(DESKTOP_MQ);

    const syncOffset = () => {
      const height = mq.matches ? header.offsetHeight : 0;
      document.documentElement.style.setProperty("--site-nav-offset", `${height}px`);
    };

    syncOffset();
    const observer = new ResizeObserver(syncOffset);
    observer.observe(header);
    mq.addEventListener("change", syncOffset);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", syncOffset);
      document.documentElement.style.removeProperty("--site-nav-offset");
    };
  }, []);

  return <div className={styles.desktopOffset} aria-hidden="true" />;
}
