import type { HomeRadarCardV0 } from "@/types/home_radar.v0";

const DEFAULT_MIN_GROUP = 3;

function withoutSiblings(card: HomeRadarCardV0): HomeRadarCardV0 {
  const { siblings: _s, ...rest } = card;
  return rest;
}

/** Newest calendar day first, then higher 1M, then name. */
function cmpNewTabOrder(a: HomeRadarCardV0, b: HomeRadarCardV0): number {
  const dayA = String(a.created_at || "").slice(0, 10);
  const dayB = String(b.created_at || "").slice(0, 10);
  if (dayA !== dayB) return dayB.localeCompare(dayA);

  const ra = a.return_1m;
  const rb = b.return_1m;
  const aMiss = ra == null || Number.isNaN(Number(ra));
  const bMiss = rb == null || Number.isNaN(Number(rb));
  if (aMiss !== bMiss) return aMiss ? 1 : -1;
  if (!aMiss && !bMiss && Number(ra) !== Number(rb)) return Number(rb) - Number(ra);

  return String(a.name || "").localeCompare(String(b.name || ""));
}

/**
 * New-tab only: ≥minGroup themes sharing `group_name` → one flipper card.
 * Lead / siblings / list: newest day, then higher 1M.
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
      const ordered = [...members].sort(cmpNewTabOrder);
      const siblings = ordered.map(withoutSiblings);
      out.push({ ...siblings[0], siblings });
    } else {
      out.push(...members);
    }
  }
  out.sort(cmpNewTabOrder);
  return out;
}
