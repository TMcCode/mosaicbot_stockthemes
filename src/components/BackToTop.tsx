"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./BackToTop.module.css";

/** Show after ~500px scroll; mobile only (see CSS). Uses IntersectionObserver — no scroll listeners. */
const SCROLL_SHOW_OFFSET_PX = 500;

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { root: null, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className={styles.anchor} aria-hidden="true">
        <div ref={sentinelRef} className={styles.sentinel} style={{ top: SCROLL_SHOW_OFFSET_PX }} />
      </div>
      <button
        type="button"
        className={styles.button}
        data-visible={visible ? "true" : "false"}
        aria-label="Back to top"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <span aria-hidden="true">↑</span>
      </button>
    </>
  );
}
