"use client";

import dynamic from "next/dynamic";

import type { ComponentProps } from "react";

type ThemeNewsPanelProps = ComponentProps<typeof import("@/components/ThemeNewsPanel").ThemeNewsPanel>;

const ThemeNewsPanelDynamic = dynamic(
  () => import("@/components/ThemeNewsPanel").then((m) => m.ThemeNewsPanel),
  {
    // Below-fold: no skeleton — panel hides entirely when a theme has no news.
    loading: () => null,
  },
);

/** Code-split theme news off the theme-page client chunk until near viewport. */
export function LazyThemeNewsPanel(props: ThemeNewsPanelProps) {
  return <ThemeNewsPanelDynamic {...props} />;
}
