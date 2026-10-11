import type {
  SearchIndexGroupRowV0,
  SearchIndexThemeRowV0,
  SearchIndexTickerRowV0,
  SearchIndexV0,
} from "../types/search_index.v0";

/** Typo correction only runs when direct matching found fewer hits than this. */
const TYPO_FALLBACK_BELOW = 3;
/** Words shorter than this are never typo-corrected (too many near neighbours). */
const TYPO_MIN_WORD_LENGTH = 5;
/** Words at least this long may be 2 edits off; shorter ones only 1. */
const TYPO_TWO_EDIT_LENGTH = 9;

/** 1–5 letter ticker-shaped queries (e.g. NVDA) — prefer symbol + membership, not loose fuzzy. */
export function isTickerishQuery(query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  const lettersOnly = q.replace(/[^a-zA-Z]/g, "");
  const compact = q.replace(/\s/g, "");
  return (
    lettersOnly.length > 0 &&
    lettersOnly.length === compact.length &&
    /^[A-Za-z]{1,5}$/.test(lettersOnly)
  );
}

/**
 * Lowercase, strip accents and punctuation, collapse whitespace:
 * "Make-Up" → "make up", "Kérastase" → "kerastase", "e.l.f." → "e l f", "Levi's" → "levis".
 */
export function normalizeSearchText(raw: string): string {
  return String(raw ?? "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function stemToken(t: string): string {
  if (t.length > 4 && t.endsWith("ies")) return `${t.slice(0, -3)}y`;
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

type PreparedText = { compact: string; tokens: string[] };

function prepareText(raw: string): PreparedText {
  const norm = normalizeSearchText(raw);
  return {
    compact: norm.replace(/ /g, ""),
    tokens: norm ? norm.split(" ").map(stemToken) : [],
  };
}

function tokenMatches(queryToken: string, fieldToken: string): boolean {
  return queryToken.length >= 2 ? fieldToken.startsWith(queryToken) : fieldToken === queryToken;
}

function allTokensMatch(queryTokens: string[], fieldTokens: string[]): boolean {
  return (
    queryTokens.length > 0 &&
    queryTokens.every((qt) => fieldTokens.some((ft) => tokenMatches(qt, ft)))
  );
}

/** Space-insensitive substring ("make up" ≈ "makeup" ≈ "make-up"); short queries only match at the start. */
function compactContains(field: string, query: string): boolean {
  if (query.length >= 4) return field.includes(query);
  return query.length >= 3 && field.startsWith(query);
}

type Tier = { exact: number; starts: number; tokens: number; contains: number };

const NAME_TIER: Tier = { exact: 100, starts: 90, tokens: 80, contains: 70 };
const ALIAS_TIER: Tier = { exact: 66, starts: 60, tokens: 56, contains: 46 };
const CROSS_FIELD_SCORE = 40;
/** Tie-break within a tier: each extra matching alias adds a little (never crosses tiers). */
const EXTRA_ALIAS_BONUS = 0.5;
const MAX_EXTRA_ALIAS_BONUS = 2;

function scoreText(q: PreparedText, t: PreparedText, tier: Tier): number {
  if (!t.compact) return 0;
  if (t.compact === q.compact) return tier.exact;
  if (t.compact.startsWith(q.compact)) return tier.starts;
  if (allTokensMatch(q.tokens, t.tokens)) return tier.tokens;
  if (compactContains(t.compact, q.compact)) return tier.contains;
  return 0;
}

export type SiteSearchHit =
  | { kind: "ticker"; ref: SearchIndexTickerRowV0; key: string }
  | { kind: "theme"; ref: SearchIndexThemeRowV0; key: string }
  | { kind: "group"; ref: SearchIndexGroupRowV0; key: string };

export type SiteSearchEngine = { index: SearchIndexV0 };

const MAX_HITS = 14;
const KIND_RANK: Record<SiteSearchHit["kind"], number> = { group: 0, theme: 1, ticker: 2 };

/** "Beauty '26: Cosmetics" → "Cosmetics", so the short label can score as an exact name. */
function themeShortName(name: string): string {
  const i = name.indexOf(":");
  return i >= 0 ? name.slice(i + 1).trim() : "";
}


type PreparedEntity = {
  hit: SiteSearchHit;
  order: number;
  names: PreparedText[];
  aliases: PreparedText[];
  /** Every token on the entity (names, aliases, slug, group/sector) for multi-field queries. */
  allTokens: string[];
};

type PreparedIndex = {
  entities: PreparedEntity[];
  /** Unique index words (already stemmed), for prefix checks and typo correction. */
  words: string[];
  wordsByLength: Map<number, string[]>;
  /** How many entities use each word — tie-break between equally close corrections. */
  wordCount: Map<string, number>;
};

const preparedCache = new WeakMap<SearchIndexV0, PreparedIndex>();

function prepareEntity(
  hit: SiteSearchHit,
  order: number,
  names: string[],
  aliases: string[],
  extras: string[],
): PreparedEntity {
  const n = names.filter(Boolean).map(prepareText);
  const a = aliases.filter(Boolean).map(prepareText);
  const e = extras.filter(Boolean).map(prepareText);
  return {
    hit,
    order,
    names: n,
    aliases: a,
    allTokens: [...n, ...a, ...e].flatMap((p) => p.tokens),
  };
}

function preparedIndex(index: SearchIndexV0): PreparedIndex {
  const cached = preparedCache.get(index);
  if (cached) return cached;
  const out: PreparedEntity[] = [];
  index.groups.forEach((g, i) => {
    out.push(
      prepareEntity({ kind: "group", ref: g, key: `group:${g.slug}` }, i, [g.name], g.aliases ?? [], [
        g.slug,
        g.spy_sector ?? "",
      ]),
    );
  });
  index.themes.forEach((t, i) => {
    out.push(
      prepareEntity(
        { kind: "theme", ref: t, key: `theme:${t.slug}` },
        i,
        [t.name, themeShortName(t.name)],
        t.aliases ?? [],
        [t.slug, t.group_name ?? ""],
      ),
    );
  });
  index.tickers.forEach((t, i) => {
    out.push(
      prepareEntity(
        { kind: "ticker", ref: t, key: `ticker:${t.ticker}` },
        i,
        [t.ticker, t.name ?? ""],
        t.aliases ?? [],
        [],
      ),
    );
  });

  const wordCount = new Map<string, number>();
  for (const e of out) {
    for (const w of new Set(e.allTokens)) wordCount.set(w, (wordCount.get(w) ?? 0) + 1);
  }
  const words = [...wordCount.keys()];
  const wordsByLength = new Map<number, string[]>();
  for (const w of words) {
    const bucket = wordsByLength.get(w.length);
    if (bucket) bucket.push(w);
    else wordsByLength.set(w.length, [w]);
  }

  const prepared: PreparedIndex = { entities: out, words, wordsByLength, wordCount };
  preparedCache.set(index, prepared);
  return prepared;
}

/**
 * Build the per-index lookup tables now (~40ms on the full index) so the first
 * keystroke doesn't pay for it. Call right after the search index loads.
 */
export function warmSiteSearchIndex(index: SearchIndexV0): void {
  preparedIndex(index);
}

function scoreEntity(q: PreparedText, e: PreparedEntity): number {
  let best = 0;
  for (const n of e.names) best = Math.max(best, scoreText(q, n, NAME_TIER));
  if (best >= NAME_TIER.contains) return best;
  let aliasHits = 0;
  for (const a of e.aliases) {
    const s = scoreText(q, a, ALIAS_TIER);
    if (s > 0) aliasHits += 1;
    best = Math.max(best, s);
  }
  if (aliasHits > 1) best += Math.min((aliasHits - 1) * EXTRA_ALIAS_BONUS, MAX_EXTRA_ALIAS_BONUS);
  if (best === 0 && allTokensMatch(q.tokens, e.allTokens)) best = CROSS_FIELD_SCORE;
  return best;
}

export type DirectSearchOptions = { kinds?: ReadonlyArray<SiteSearchHit["kind"]> };

/**
 * Normalized name/alias matches, best first: exact name → name prefix → name words →
 * alias exact → alias words → words spread across fields. Groups before themes before
 * tickers on ties.
 */
export function rankDirectSearchHits(
  index: SearchIndexV0,
  query: string,
  opts: DirectSearchOptions = {},
): SiteSearchHit[] {
  return rankPrepared(preparedIndex(index), prepareText(query), opts);
}

function rankPrepared(p: PreparedIndex, q: PreparedText, opts: DirectSearchOptions): SiteSearchHit[] {
  if (!q.compact) return [];
  const kinds = new Set(opts.kinds ?? ["group", "theme", "ticker"]);
  const scored: { e: PreparedEntity; score: number }[] = [];
  for (const e of p.entities) {
    if (!kinds.has(e.hit.kind)) continue;
    const score = scoreEntity(q, e);
    if (score > 0) scored.push({ e, score });
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      KIND_RANK[a.e.hit.kind] - KIND_RANK[b.e.hit.kind] ||
      a.e.order - b.e.order,
  );
  return scored.map((s) => s.e.hit);
}

/** Optimal-string-alignment distance (adjacent swaps count as 1), or `max + 1` once it can't stay ≤ max. */
function editDistanceWithin(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = b.length;
  let prev2 = new Array<number>(n + 1).fill(0);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let cur = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  return prev[n];
}

function correctWord(word: string, p: PreparedIndex): string {
  if (word.length < TYPO_MIN_WORD_LENGTH) return word;
  if (p.words.some((w) => w.startsWith(word))) return word;
  const maxEdits = word.length >= TYPO_TWO_EDIT_LENGTH ? 2 : 1;
  let best = word;
  let bestDist = maxEdits + 1;
  let bestCount = 0;
  for (let len = word.length - maxEdits; len <= word.length + maxEdits; len++) {
    for (const w of p.wordsByLength.get(len) ?? []) {
      const d = editDistanceWithin(word, w, maxEdits);
      if (d > maxEdits) continue;
      const count = p.wordCount.get(w) ?? 0;
      if (d < bestDist || (d === bestDist && count > bestCount)) {
        best = w;
        bestDist = d;
        bestCount = count;
      }
    }
  }
  return best;
}

function correctPrepared(p: PreparedIndex, query: string): PreparedText | null {
  const q = prepareText(query);
  const tokens = q.tokens.map((t) => correctWord(t, p));
  if (tokens.every((t, i) => t === q.tokens[i])) return null;
  return { compact: tokens.join(""), tokens };
}

/**
 * Spell-correct each query word against words that appear in the index
 * ("cosmetcs" → "cosmetic", "semiconducters" → "semiconductor"). Words of 5+ letters
 * that match nothing may be 1 edit off (2 edits from 9 letters). Null when nothing changed.
 */
export function correctSearchTypos(index: SearchIndexV0, query: string): string | null {
  return correctPrepared(preparedIndex(index), query)?.tokens.join(" ") ?? null;
}

/** Direct ranking of the spell-corrected query; empty when no word needed correcting. */
export function rankTypoCorrectedHits(
  index: SearchIndexV0,
  query: string,
  opts: DirectSearchOptions = {},
): SiteSearchHit[] {
  const p = preparedIndex(index);
  const corrected = correctPrepared(p, query);
  return corrected ? rankPrepared(p, corrected, opts) : [];
}

/** Few direct hits → also try spell-correcting the query. */
export function shouldRunTypoFallback(directHitCount: number): boolean {
  return directHitCount < TYPO_FALLBACK_BELOW;
}

function pushHit(out: SiteSearchHit[], seen: Set<string>, hit: SiteSearchHit, max = MAX_HITS): boolean {
  if (out.length >= max || seen.has(hit.key)) return out.length >= max;
  seen.add(hit.key);
  out.push(hit);
  return out.length >= max;
}

export function collectSiteSearchHits(index: SearchIndexV0, query: string): SiteSearchHit[] {
  const q = query.trim();
  if (!q) {
    return [];
  }
  const tickerish = isTickerishQuery(q);
  const upper = q.replace(/[^a-zA-Z]/g, "").toUpperCase();

  const seen = new Set<string>();
  const out: SiteSearchHit[] = [];
  const themesBySlug = new Map(index.themes.map((t) => [t.slug, t]));

  // 1) Ticker prefix matches (NVDA, AAPL, …)
  if (tickerish && upper.length >= 1) {
    const matches = index.tickers.filter((t) => t.ticker.startsWith(upper));
    matches.sort((a, b) => {
      const ex = a.ticker === upper ? 0 : 1;
      const ey = b.ticker === upper ? 0 : 1;
      if (ex !== ey) return ex - ey;
      return a.ticker.localeCompare(b.ticker);
    });
    for (const t of matches.slice(0, 10)) {
      if (pushHit(out, seen, { kind: "ticker", ref: t, key: `ticker:${t.ticker}` })) {
        return out;
      }
    }

    // Themes that actually hold those tickers (structured, not fuzzy).
    for (const t of matches.slice(0, 10)) {
      for (const slug of t.theme_slugs ?? []) {
        const theme = themesBySlug.get(slug);
        if (!theme) continue;
        if (pushHit(out, seen, { kind: "theme", ref: theme, key: `theme:${theme.slug}` })) {
          return out;
        }
      }
    }
  }

  if (q.length < 2 && !tickerish) {
    return out.slice(0, MAX_HITS);
  }

  // 2) Ranked name / alias matches (normalized: "make up" = "make-up" = "makeup").
  // Short symbol-shaped queries ("ai", "ev") skip company names, which would flood results;
  // 4–5 letter words ("nike", "apple") still find companies by name.
  const includeTickerNames = !tickerish || upper.length >= 4;
  const kinds: SiteSearchHit["kind"][] = includeTickerNames
    ? ["group", "theme", "ticker"]
    : ["group", "theme"];
  const direct = rankDirectSearchHits(index, q, { kinds });
  for (const hit of direct) {
    if (pushHit(out, seen, hit)) {
      return out;
    }
  }

  // 3) Spell-corrected query only when direct matching came up short.
  if (!tickerish && shouldRunTypoFallback(direct.length)) {
    for (const hit of rankTypoCorrectedHits(index, q)) {
      if (pushHit(out, seen, hit)) break;
    }
  }

  return out;
}

/**
 * Same ranking as {@link collectSiteSearchHits}, but results are themes only:
 * theme hits pass through; ticker hits expand to member themes; group hits
 * expand to themes in that group.
 */
export function collectSiteSearchThemeHits(
  index: SearchIndexV0,
  query: string,
  limit = 12,
): SearchIndexThemeRowV0[] {
  const hits = collectSiteSearchHits(index, query);
  if (!hits.length || limit <= 0) return [];

  const themesBySlug = new Map(index.themes.map((t) => [t.slug, t]));
  const seen = new Set<string>();
  const out: SearchIndexThemeRowV0[] = [];

  const pushTheme = (theme: SearchIndexThemeRowV0 | undefined): boolean => {
    if (!theme || out.length >= limit) return out.length >= limit;
    if (seen.has(theme.slug)) return false;
    seen.add(theme.slug);
    out.push(theme);
    return out.length >= limit;
  };

  for (const hit of hits) {
    if (out.length >= limit) break;
    if (hit.kind === "theme") {
      pushTheme(hit.ref);
      continue;
    }
    if (hit.kind === "ticker") {
      for (const slug of hit.ref.theme_slugs ?? []) {
        if (pushTheme(themesBySlug.get(slug))) break;
      }
      continue;
    }
    for (const theme of index.themes) {
      if (theme.group_slug !== hit.ref.slug) continue;
      if (pushTheme(theme)) break;
    }
  }

  return out;
}
