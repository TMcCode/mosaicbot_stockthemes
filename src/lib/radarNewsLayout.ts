import type { RadarNewsCardV0 } from "@/types/radar_news.v0";

/** Matches TimBot / editorial publish: leads at/after 2pm ET on as_of day. */
export const RADAR_AFTERNOON_ET_HOUR = 14;

type EtParts = { date: string; hour: number };

function etPartsFromIso(iso: string): EtParts | null {
  const raw = String(iso || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
    if (!m) return null;
    return { date: m[1]!, hour: 12 };
  }
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const mo = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "12");
  if (!y || !mo || !day) return null;
  return { date: `${y}-${mo}-${day}`, hour };
}

export function cardLeadPublishedAt(card: RadarNewsCardV0): string {
  return String(card.headlines?.[0]?.published_at || card.latest_at || "").trim();
}

export function isAfternoonLead(
  publishedAt: string | null | undefined,
  asOf: string,
  cutoffHour: number = RADAR_AFTERNOON_ET_HOUR,
): boolean {
  const asOfKey = String(asOf || "").trim().slice(0, 10);
  const et = etPartsFromIso(String(publishedAt || ""));
  if (!asOfKey || !et) return false;
  return et.date === asOfKey && et.hour >= cutoffHour;
}

export function isAfternoonNewsCard(
  card: RadarNewsCardV0,
  asOf: string,
  cutoffHour: number = RADAR_AFTERNOON_ET_HOUR,
): boolean {
  return isAfternoonLead(cardLeadPublishedAt(card), asOf, cutoffHour);
}

/**
 * Split for the Afternoon break. Returns null afternoon when none — caller
 * should omit the break chrome entirely.
 */
export function splitAfternoonMorning(
  cards: RadarNewsCardV0[],
  asOf: string,
): { afternoon: RadarNewsCardV0[]; morning: RadarNewsCardV0[] } {
  const afternoon: RadarNewsCardV0[] = [];
  const morning: RadarNewsCardV0[] = [];
  for (const c of cards) {
    if (isAfternoonNewsCard(c, asOf)) afternoon.push(c);
    else morning.push(c);
  }
  return { afternoon, morning };
}
