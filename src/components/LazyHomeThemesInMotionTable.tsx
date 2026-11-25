"use client";

import dynamic from "next/dynamic";

import type { ComponentProps } from "react";

type Props = ComponentProps<
  typeof import("@/components/HomeThemesInMotionTable").HomeThemesInMotionTable
>;

const HomeThemesInMotionTableDynamic = dynamic(
  () =>
    import("@/components/HomeThemesInMotionTable").then((m) => m.HomeThemesInMotionTable),
  {
    loading: () => (
      <section
        aria-busy="true"
        aria-label="Loading Most talked about"
        style={{ minHeight: 280 }}
      />
    ),
  },
);

/** Code-split Most talked about table off the main home client chunk. */
export function LazyHomeThemesInMotionTable(props: Props) {
  return <HomeThemesInMotionTableDynamic {...props} />;
}
