"use client";

import { useEffect, useState } from "react";

import { notesByTicker, parseThemeNotes } from "@/lib/themeNotes";
import { fetchThemeTableSidecarText } from "@/lib/themeTableSidecarFetch";

export type StockMembershipNoteRow = {
  slug: string;
  note: string | null;
};

export type StockMembershipNotesState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; bySlug: Record<string, string | null>; anyNotes: boolean }
  | { status: "error" };

/**
 * Lazy-load membership rationale for one ticker across its themes by reading
 * each theme’s Tier B ``.notes.v0.json`` (already published; no stock inverse required).
 */
export function useStockMembershipNotes(
  ticker: string | undefined,
  themeSlugs: string[],
  dataBaseUrl: string | undefined,
  enabled: boolean,
): StockMembershipNotesState {
  const [state, setState] = useState<StockMembershipNotesState>({ status: "idle" });
  const slugsKey = themeSlugs.join("|");

  useEffect(() => {
    if (!enabled) return;
    const t = String(ticker || "")
      .trim()
      .toUpperCase();
    if (!t || !dataBaseUrl || themeSlugs.length === 0) {
      setState({ status: "ok", bySlug: {}, anyNotes: false });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setState({ status: "loading" });

    void Promise.all(
      themeSlugs.map(async (slug) => {
        try {
          const raw = await fetchThemeTableSidecarText(
            "notes",
            slug,
            dataBaseUrl,
            controller.signal,
          );
          if (raw == null) return { slug, note: null as string | null };
          const parsed = parseThemeNotes(raw);
          const note = notesByTicker(parsed).get(t) ?? null;
          return { slug, note };
        } catch {
          return { slug, note: null as string | null };
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      const bySlug: Record<string, string | null> = {};
      let anyNotes = false;
      for (const row of rows) {
        bySlug[row.slug] = row.note;
        if (row.note) anyNotes = true;
      }
      setState({ status: "ok", bySlug, anyNotes });
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // themeSlugs identity via slugsKey
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slugsKey encodes themeSlugs
  }, [ticker, dataBaseUrl, enabled, slugsKey]);

  return state;
}
