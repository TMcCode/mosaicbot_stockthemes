import type { ThemeFactorProfileV0, ThemeFactorScoreEntryV0 } from "@/types/theme.factor_profile.v0";

/** Top/bottom band that may be named in the blurb. */
export const FACTOR_BLURB_ELIGIBLE_PCT = 0.2;
/** Inner band for “definitely” vs “kinda” wording. */
export const FACTOR_BLURB_DEFINITE_PCT = 0.1;
/** Bottom-10% + score at/below this → contra (inverse) wording. */
export const FACTOR_BLURB_CONTRA_SCORE_MAX = 40;
export const FACTOR_BLURB_MAX_PER_SIDE = 2;

/** Sector sentence: rank in top 20% and score ≥ this. */
export const SECTOR_BLURB_MIN_SCORE = 60;
/** “Fairly tight match” if score ≥ this or rank in top 10%. */
export const SECTOR_BLURB_TIGHT_SCORE = 70;

/** If both members clear the high bar, name neither of the pair. */
export const FACTOR_BLURB_CONFLICT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["VALUE_CYCLICAL", "GROWTH_DURATION"],
  ["QUALITY_DEFENSIVE", "SPECULATIVE_BETA"],
  ["QUALITY_DEFENSIVE", "UNPROFITABLE_GROWTH"],
  ["FALLING_RATE", "VALUE_CYCLICAL"],
];

export type FactorBlurbStrength = "definite" | "kinda";
export type FactorBlurbLowKind = "less_tied" | "contra";

export type FactorBlurbPick = {
  id: string;
  label: string;
  strength: FactorBlurbStrength;
  score: number;
  rank: number;
  total: number;
  /** Smaller = more extreme for the side (for sorting). */
  extremity: number;
};

export type FactorProfileBlurbResult = {
  factorSentence: string;
  sectorSentence: string | null;
  /** Joined for UI; factor sentence always present when result is non-null. */
  text: string;
};

/** Prefer co-movement score when published (same rule as themeFactorDisplayScore). */
function displayScore(entry: ThemeFactorScoreEntryV0): number {
  if (entry.score_standalone != null && Number.isFinite(entry.score_standalone)) {
    return Math.max(0, Math.min(100, Math.round(entry.score_standalone)));
  }
  return Math.max(0, Math.min(100, Math.round(entry.score)));
}

function displayRank(entry: ThemeFactorScoreEntryV0): { rank: number; total: number } | null {
  const total = entry.total;
  if (total == null || !Number.isFinite(total) || total <= 0) return null;
  const preferStandalone =
    entry.score_standalone != null && Number.isFinite(entry.score_standalone);
  const rank = preferStandalone ? entry.rank_standalone : entry.rank;
  if (rank == null || !Number.isFinite(rank) || rank <= 0) return null;
  return { rank: Math.floor(rank), total: Math.floor(total) };
}

/** Short blurb label; strip trailing Exposure / Sensitivity noise. */
function shortLabel(entry: ThemeFactorScoreEntryV0): string {
  const raw =
    entry.id === "MEME_RETAIL"
      ? "Retail Speculation Exposure"
      : entry.label?.trim() || entry.id;
  return raw.replace(/\s+(Exposure|Sensitivity)$/i, "").trim();
}

function joinLabels(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function classifyHigh(entry: ThemeFactorScoreEntryV0): FactorBlurbPick | null {
  const rt = displayRank(entry);
  if (!rt) return null;
  const pctFromTop = rt.rank / rt.total;
  if (pctFromTop > FACTOR_BLURB_ELIGIBLE_PCT) return null;
  const score = displayScore(entry);
  const strength: FactorBlurbStrength =
    pctFromTop <= FACTOR_BLURB_DEFINITE_PCT ? "definite" : "kinda";
  return {
    id: entry.id,
    label: shortLabel(entry),
    strength,
    score,
    rank: rt.rank,
    total: rt.total,
    extremity: pctFromTop,
  };
}

function classifyLow(
  entry: ThemeFactorScoreEntryV0,
): (FactorBlurbPick & { kind: FactorBlurbLowKind }) | null {
  const rt = displayRank(entry);
  if (!rt) return null;
  const pctFromTop = rt.rank / rt.total;
  if (pctFromTop < 1 - FACTOR_BLURB_ELIGIBLE_PCT) return null;
  const score = displayScore(entry);
  const strength: FactorBlurbStrength =
    pctFromTop >= 1 - FACTOR_BLURB_DEFINITE_PCT ? "definite" : "kinda";
  const kind: FactorBlurbLowKind =
    strength === "definite" && score <= FACTOR_BLURB_CONTRA_SCORE_MAX ? "contra" : "less_tied";
  return {
    id: entry.id,
    label: shortLabel(entry),
    strength,
    score,
    rank: rt.rank,
    total: rt.total,
    extremity: 1 - pctFromTop,
    kind,
  };
}

function sortPicks<T extends FactorBlurbPick>(picks: T[]): T[] {
  return [...picks].sort((a, b) => {
    if (a.extremity !== b.extremity) return a.extremity - b.extremity;
    // High: higher score wins ties; low callers pass already-oriented extremity.
    if (a.score !== b.score) return b.score - a.score;
    return a.label.localeCompare(b.label);
  });
}

function sortLowPicks(
  picks: Array<FactorBlurbPick & { kind: FactorBlurbLowKind }>,
): Array<FactorBlurbPick & { kind: FactorBlurbLowKind }> {
  return [...picks].sort((a, b) => {
    if (a.extremity !== b.extremity) return a.extremity - b.extremity;
    // More extreme low → prefer lower score on ties.
    if (a.score !== b.score) return a.score - b.score;
    return a.label.localeCompare(b.label);
  });
}

/** Drop both members of any conflict pair that both cleared the high bar. */
export function suppressConflictingHighs(highs: FactorBlurbPick[]): FactorBlurbPick[] {
  const ids = new Set(highs.map((h) => h.id));
  const drop = new Set<string>();
  for (const [a, b] of FACTOR_BLURB_CONFLICT_PAIRS) {
    if (ids.has(a) && ids.has(b)) {
      drop.add(a);
      drop.add(b);
    }
  }
  if (drop.size === 0) return highs;
  return highs.filter((h) => !drop.has(h.id));
}

function formatHighSentence(highs: FactorBlurbPick[]): string {
  const definite = highs.filter((h) => h.strength === "definite");
  const kinda = highs.filter((h) => h.strength === "kinda");
  if (definite.length && kinda.length) {
    return `This theme has tended to do better when ${joinLabels(definite.map((h) => h.label))} lead, with some link to ${joinLabels(kinda.map((h) => h.label))}.`;
  }
  if (definite.length) {
    const labels = joinLabels(definite.map((h) => h.label));
    const verb = definite.length === 1 ? "leads" : "lead";
    return `This theme has tended to do better when ${labels} ${verb}.`;
  }
  return `This theme has shown some link to ${joinLabels(kinda.map((h) => h.label))}.`;
}

function formatLowSentence(lows: Array<FactorBlurbPick & { kind: FactorBlurbLowKind }>): string {
  const contra = lows.filter((l) => l.kind === "contra");
  const less = lows.filter((l) => l.kind === "less_tied");
  if (less.length && contra.length) {
    const lessLabels = joinLabels(less.map((l) => l.label));
    const contraLabels = joinLabels(contra.map((l) => l.label));
    const contraVerb = contra.length === 1 ? "leads" : "lead";
    return `It is less tied to ${lessLabels}, and has tended to move the other way when ${contraLabels} ${contraVerb}.`;
  }
  if (less.length) {
    const labels = joinLabels(less.map((l) => l.label));
    const allKinda = less.every((l) => l.strength === "kinda");
    return allKinda
      ? `It is only weakly tied to ${labels}.`
      : `It is less tied to ${labels}.`;
  }
  const labels = joinLabels(contra.map((l) => l.label));
  const verb = contra.length === 1 ? "leads" : "lead";
  return `It has tended to move the other way when ${labels} ${verb}.`;
}

function buildFactorSentence(
  highs: FactorBlurbPick[],
  lows: Array<FactorBlurbPick & { kind: FactorBlurbLowKind }>,
): string {
  if (!highs.length && !lows.length) {
    return "No single factor stands out in the top or bottom of the theme universe — the profile looks fairly balanced.";
  }
  if (highs.length && lows.length) {
    return `${formatHighSentence(highs)} ${formatLowSentence(lows)}`;
  }
  if (highs.length) {
    return `${formatHighSentence(highs).replace(/\.$/, "")}; no clear factor it strongly avoids.`;
  }
  // Low-only: open with “This theme” instead of “It”.
  return formatLowSentence(lows).replace(/^It\b/, "This theme");
}

export function buildSectorBlurbSentence(entry: ThemeFactorScoreEntryV0 | null | undefined): string | null {
  if (!entry) return null;
  const rt = displayRank(entry);
  if (!rt) return null;
  const score = displayScore(entry);
  const pctFromTop = rt.rank / rt.total;
  if (pctFromTop > FACTOR_BLURB_ELIGIBLE_PCT || score < SECTOR_BLURB_MIN_SCORE) return null;
  const label = shortLabel(entry);
  const tight = score >= SECTOR_BLURB_TIGHT_SCORE || pctFromTop <= FACTOR_BLURB_DEFINITE_PCT;
  const closeness = tight ? "a fairly tight match" : "a modest match";
  return `Closest sector signal: ${label} (score ${score}, #${rt.rank}) — ${closeness}.`;
}

/**
 * Natural-language Factor Profile summary from sidecar rows (client-side; no extra fetch).
 * Uses rank first (vs universe), then score. Returns null only if there are no factor rows to consider.
 */
export function buildFactorProfileBlurb(profile: ThemeFactorProfileV0): FactorProfileBlurbResult | null {
  const pos = profile.factors_positive ?? [];
  const neg = profile.factors_negative ?? [];
  if (!pos.length && !neg.length) return null;

  // Only name highs from the Higher column / lows from the Lower column so copy
  // can't contradict the card (e.g. Falling-Rate in Higher but “opposite” in blurb).
  const highRaw = sortPicks(pos.map(classifyHigh).filter((x): x is FactorBlurbPick => x != null));
  const highsAfterConflict = suppressConflictingHighs(highRaw);
  // Opposite factors both high → naming either is unhelpful; fall through to flat.
  const conflictWipedHighs = highRaw.length > 0 && highsAfterConflict.length === 0;
  const highs = conflictWipedHighs ? [] : highsAfterConflict.slice(0, FACTOR_BLURB_MAX_PER_SIDE);

  const lowRaw = sortLowPicks(
    neg.map(classifyLow).filter((x): x is FactorBlurbPick & { kind: FactorBlurbLowKind } => x != null),
  );
  const lows = conflictWipedHighs ? [] : lowRaw.slice(0, FACTOR_BLURB_MAX_PER_SIDE);

  const factorSentence = buildFactorSentence(highs, lows);
  const sectorSentence = buildSectorBlurbSentence(profile.dominant_sector);
  const text = sectorSentence ? `${factorSentence} ${sectorSentence}` : factorSentence;
  return { factorSentence, sectorSentence, text };
}
