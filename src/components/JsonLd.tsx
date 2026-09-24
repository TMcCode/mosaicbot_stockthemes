"use client";

import { useEffect } from "react";

/**
 * Inject JSON-LD via DOM (not JSX `<script>`).
 * React 19 warns on script tags rendered in the component tree; Google still reads this.
 */
export function JsonLd({ data, id = "json-ld" }: { data: unknown; id?: string }) {
  useEffect(() => {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    el.text = JSON.stringify(data).replace(/</g, "\\u003c");
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [data, id]);

  return null;
}
