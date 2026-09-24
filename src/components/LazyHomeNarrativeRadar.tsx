"use client";

import dynamic from "next/dynamic";

import type { ComponentProps } from "react";

type HomeNarrativeRadarProps = ComponentProps<
  typeof import("@/components/HomeNarrativeRadar").HomeNarrativeRadar
>;

const HomeNarrativeRadarDynamic = dynamic(
  () =>
    import("@/components/HomeNarrativeRadar").then((m) => m.HomeNarrativeRadar),
  {
    loading: () => (
      <section aria-busy="true" aria-label="Loading Narrative Radar" style={{ minHeight: 220 }} />
    ),
  },
);

/** Code-split Narrative Radar off the main client chunk (home + /radar). */
export function LazyHomeNarrativeRadar(props: HomeNarrativeRadarProps) {
  return <HomeNarrativeRadarDynamic {...props} />;
}
