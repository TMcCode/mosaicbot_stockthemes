"use client";

import { useEffect, useState } from "react";

/** Re-render once per minute so session-only columns flip at ET session boundaries. */
export function useUsMarketSessionNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}
