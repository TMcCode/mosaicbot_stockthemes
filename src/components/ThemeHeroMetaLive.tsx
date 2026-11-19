"use client";

import type { ComponentProps } from "react";

import { ThemeHeroMeta } from "@/components/ThemeHeroMeta";
import { useLiveRank10d } from "@/hooks/useLiveRank10d";
import { rank10dFromPayload } from "@/lib/themeCompareRank";

type Props = ComponentProps<typeof ThemeHeroMeta> & {
  /** Theme URL slug — keys into `rank_10d.v0.json` `themes`. */
  slug: string;
};

/**
 * Theme hero meta with live 10D ranks from `rank_10d.v0.json` (no rebuild needed).
 * The rank row keeps its space but stays hidden until the live rank loads, so the stale
 * build-time number never flashes; it falls back to the build-time rank on failure.
 */
export function ThemeHeroMetaLive({ slug, rank10d, ...rest }: Props) {
  const { payload, settled } = useLiveRank10d();
  const liveRank = payload?.themes ? rank10dFromPayload(payload.themes[slug]) : null;
  return <ThemeHeroMeta {...rest} rank10d={liveRank ?? rank10d} ranksPending={!settled} />;
}
