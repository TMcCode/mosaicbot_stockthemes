"use client";

import { useEffect, useState } from "react";

import {
  getThemeSidecarMemory,
  isThemeSidecarTerminalStatus,
  setThemeSidecarMemory,
  themeSidecarCacheKey,
} from "@/lib/themeSidecarMemoryCache";
import { fetchThemeTableSidecarText } from "@/lib/themeTableSidecarFetch";
import { notesSidecarHasContent, parseThemeNotes } from "@/lib/themeNotes";
import type { ThemeNotesV0 } from "@/types/theme.notes.v0";

export type ThemeNotesSidecarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "absent" }
  | { status: "ok"; data: ThemeNotesV0 }
  | { status: "error" };

const CACHE_NS = "theme-notes";

function initialState(
  slug: string | undefined,
  dataBaseUrl: string | undefined,
): ThemeNotesSidecarState {
  if (slug && dataBaseUrl) {
    const cached = getThemeSidecarMemory<ThemeNotesSidecarState>(
      CACHE_NS,
      themeSidecarCacheKey(dataBaseUrl, slug),
    );
    if (cached && isThemeSidecarTerminalStatus(cached.status)) return cached;
  }
  return { status: "idle" };
}

/** Lazy-fetch membership notes once per theme when the Notes tab is opened. */
export function useThemeNotesSidecar(
  slug: string | undefined,
  dataBaseUrl: string | undefined,
  enabled: boolean,
): ThemeNotesSidecarState {
  const [state, setState] = useState<ThemeNotesSidecarState>(() =>
    initialState(slug, dataBaseUrl),
  );

  useEffect(() => {
    if (!enabled) return;
    if (!slug || !dataBaseUrl) return;

    const key = themeSidecarCacheKey(dataBaseUrl, slug);
    const cached = getThemeSidecarMemory<ThemeNotesSidecarState>(CACHE_NS, key);
    if (cached && isThemeSidecarTerminalStatus(cached.status)) {
      setState(cached);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (!cancelled) setState({ status: "loading" });
    });
    fetchThemeTableSidecarText("notes", slug, dataBaseUrl, controller.signal)
      .then((raw) => {
        if (cancelled) return;
        if (raw === null) {
          const next: ThemeNotesSidecarState = { status: "absent" };
          setThemeSidecarMemory(CACHE_NS, key, next);
          setState(next);
          return;
        }
        const parsed = parseThemeNotes(raw);
        const next: ThemeNotesSidecarState = notesSidecarHasContent(parsed)
          ? { status: "ok", data: parsed }
          : { status: "absent" };
        setThemeSidecarMemory(CACHE_NS, key, next);
        setState(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next: ThemeNotesSidecarState = { status: "error" };
        setThemeSidecarMemory(CACHE_NS, key, next);
        setState(next);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug, dataBaseUrl, enabled]);

  return enabled && (!slug || !dataBaseUrl) ? { status: "absent" } : state;
}
