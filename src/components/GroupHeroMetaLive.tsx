"use client";

import type { ComponentProps } from "react";

import { GroupHeroMeta } from "@/components/GroupHeroMeta";
import { useLiveRank10d } from "@/hooks/useLiveRank10d";
import { rank10dFromGroupPayload } from "@/lib/groupCompareRank";

type Props = ComponentProps<typeof GroupHeroMeta> & {
  /** Group URL slug — keys into `rank_10d.v0.json` `groups`. */
  slug: string;
};

/**
 * Group hero meta with live 10D ranks from `rank_10d.v0.json` (no rebuild needed).
 * The rank row keeps its space but stays hidden until the live rank loads, so the stale
 * build-time number never flashes; it falls back to the build-time rank on failure.
 */
export function GroupHeroMetaLive({ slug, rank10d, ...rest }: Props) {
  const { payload, settled } = useLiveRank10d();
  const liveRank = payload?.groups ? rank10dFromGroupPayload(payload.groups[slug]) : null;
  return <GroupHeroMeta {...rest} rank10d={liveRank ?? rank10d} ranksPending={!settled} />;
}
