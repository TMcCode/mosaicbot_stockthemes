import type { HomeRadarCardV0 } from "@/types/home_radar.v0";

const DEFAULT_MIN_GROUP = 3;

function withoutSiblings(card: HomeRadarCardV0): HomeRadarCardV0 {
  const { siblings: _s, ...rest } = card;
  return rest;
}

/** ISO created_at then name — newest first when sorting descending. */
function recencySortKey(card: HomeRadarCardV0): [string, string] {
  return [String(card.created_at || ""), String(card.name || "")];
}

function cmpRecencyDesc(a: HomeRadarCardV0, b: HomeRadarCardV0): number {
  const [ca, na] = recencySortKey(a);
  const [cb, nb] = recencySortKey(b);
  if (ca !== cb) return cb.localeCompare(ca);
  return na.localeCompare(nb);
}

/**
 * New-tab only: ≥minGroup themes sharing `group_name` → one flipper card.
 * Lead = newest created_at; `siblings` by recency desc; card list by lead recency.
 * Idempotent. Tiny N (≤~30) — bake already sorts; this only mirrors publish order.
 */
export function collapseNewTabGroupFlippers(
  cards: HomeRadarCardV0[],
  minGroup: number = DEFAULT_MIN_GROUP,
): HomeRadarCardV0[] {
  const threshold = Math.max(2, minGroup);

  const flat: HomeRadarCardV0[] = [];
  for (const card of cards) {
    const sibs = card.siblings;
    if (Array.isArray(sibs) && sibs.length >= threshold) {
      for (const s of sibs) flat.push(withoutSiblings(s));
    } else {
      flat.push(withoutSiblings(card));
    }
  }

  const byGroup = new Map<string, HomeRadarCardV0[]>();
  const order: string[] = [];
  for (const card of flat) {
    const g = String(card.group_name || "").trim();
    const key = g ? g.toLowerCase() : `__solo__${card.slug || order.length}`;
    if (!byGroup.has(key)) {
      byGroup.set(key, []);
      order.push(key);
    }
    byGroup.get(key)!.push(card);
  }

  const out: HomeRadarCardV0[] = [];
  for (const key of order) {
    const members = byGroup.get(key) || [];
    const g = String(members[0]?.group_name || "").trim();
    if (g && members.length >= threshold) {
      const ordered = [...members].sort(cmpRecencyDesc);
      const siblings = ordered.map(withoutSiblings);
      out.push({ ...siblings[0], siblings });
    } else {
      out.push(...members);
    }
  }
  out.sort(cmpRecencyDesc);
  return out;
}
