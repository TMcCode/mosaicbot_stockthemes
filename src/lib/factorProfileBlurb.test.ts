import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-stripping test runner requires the source extension.
import {
  buildFactorProfileBlurb,
  buildSectorBlurbSentence,
  suppressConflictingHighs,
} from "./factorProfileBlurb.ts";
import type { ThemeFactorProfileV0, ThemeFactorScoreEntryV0 } from "../types/theme.factor_profile.v0.ts";

function entry(
  partial: Partial<ThemeFactorScoreEntryV0> & Pick<ThemeFactorScoreEntryV0, "id" | "label" | "score">,
): ThemeFactorScoreEntryV0 {
  return {
    score_standalone: partial.score_standalone ?? partial.score,
    rank_standalone: partial.rank_standalone ?? partial.rank,
    total: partial.total ?? 1287,
    ...partial,
  };
}

function profile(
  pos: ThemeFactorScoreEntryV0[],
  neg: ThemeFactorScoreEntryV0[],
  dominant_sector?: ThemeFactorScoreEntryV0 | null,
): ThemeFactorProfileV0 {
  return {
    schema_version: "theme.factor_profile.v0",
    factors_positive: pos,
    factors_negative: neg,
    dominant_sector: dominant_sector ?? null,
  };
}

test("screenshot-like: definite value high + less-tied lows + tight sector", () => {
  const result = buildFactorProfileBlurb(
    profile(
      [
        entry({ id: "MARKET", label: "Market Beta Exposure", score: 46, rank: 1218 }),
        entry({ id: "VALUE_CYCLICAL", label: "Value / Cyclical Exposure", score: 56, rank: 76 }),
        entry({ id: "FALLING_RATE", label: "Falling-Rate Sensitivity", score: 54, rank: 274 }),
      ],
      [
        entry({ id: "GROWTH_DURATION", label: "Growth / Duration Exposure", score: 44, rank: 1212 }),
        entry({ id: "MOMENTUM", label: "Momentum Exposure", score: 41, rank: 1219 }),
        entry({ id: "UNPROFITABLE_GROWTH", label: "Unprofitable Growth Exposure", score: 47, rank: 1221 }),
      ],
      entry({
        id: "XLPRE",
        label: "Consumer Staples",
        score: 75,
        rank: 10,
        total: 1287,
      }),
    ),
  );
  assert.ok(result);
  assert.match(result.factorSentence, /Value \/ Cyclical leads/);
  assert.match(result.factorSentence, /less tied to/);
  assert.doesNotMatch(result.factorSentence, /Falling-Rate/); // #274 outside top 20%
  // Market is in Higher column but bottom-universe — must not become a low-side claim.
  assert.doesNotMatch(result.factorSentence, /Market/);
  assert.ok(result.sectorSentence);
  assert.match(result.sectorSentence, /Consumer Staples/);
  assert.match(result.sectorSentence, /fairly tight match/);
});

test("Falling-Rate in Higher column with bottom rank is not called opposite", () => {
  const result = buildFactorProfileBlurb(
    profile(
      [
        entry({ id: "CREDIT_RISK_ON", label: "Credit Risk-On Sensitivity", score: 54, rank: 98 }),
        entry({ id: "MOMENTUM", label: "Momentum Exposure", score: 52, rank: 385 }),
        entry({ id: "FALLING_RATE", label: "Falling-Rate Sensitivity", score: 40, rank: 1223 }),
      ],
      [
        entry({ id: "AI_INNOVATION", label: "AI / Innovation Narrative Exposure", score: 47, rank: 1186 }),
        entry({ id: "SMALL_CAP", label: "Small-Cap Exposure", score: 41, rank: 1252 }),
        entry({ id: "SPECULATIVE_BETA", label: "Speculative Beta Exposure", score: 49, rank: 1045 }),
      ],
    ),
  );
  assert.ok(result);
  assert.match(result.factorSentence, /Credit Risk-On leads/);
  assert.doesNotMatch(result.factorSentence, /Sensitivity/);
  assert.doesNotMatch(result.factorSentence, /Falling-Rate/);
  assert.doesNotMatch(result.factorSentence, /opposite|other way/);
  assert.match(result.factorSentence, /less tied to/);
  assert.match(result.factorSentence, /Small-Cap/);
  // Two sentences: high then low.
  assert.match(result.factorSentence, /\. It is less tied/);
});

test("flat when nothing in top/bottom 20%", () => {
  const result = buildFactorProfileBlurb(
    profile(
      [
        entry({ id: "VALUE_CYCLICAL", label: "Value / Cyclical Exposure", score: 52, rank: 400 }),
        entry({ id: "MOMENTUM", label: "Momentum Exposure", score: 51, rank: 500 }),
      ],
      [entry({ id: "GROWTH_DURATION", label: "Growth / Duration Exposure", score: 49, rank: 600 })],
    ),
  );
  assert.ok(result);
  assert.match(result.factorSentence, /fairly balanced/);
  assert.equal(result.sectorSentence, null);
});

test("conflict VALUE + GROWTH both high → flat", () => {
  const result = buildFactorProfileBlurb(
    profile(
      [
        entry({ id: "VALUE_CYCLICAL", label: "Value / Cyclical Exposure", score: 70, rank: 50 }),
        entry({ id: "GROWTH_DURATION", label: "Growth / Duration Exposure", score: 68, rank: 60 }),
      ],
      [entry({ id: "MOMENTUM", label: "Momentum Exposure", score: 35, rank: 1200 })],
    ),
  );
  assert.ok(result);
  assert.match(result.factorSentence, /fairly balanced/);
  assert.doesNotMatch(result.factorSentence, /Momentum/);
});

test("conflict FALLING_RATE + VALUE_CYCLICAL both high → flat", () => {
  const result = buildFactorProfileBlurb(
    profile(
      [
        entry({ id: "FALLING_RATE", label: "Falling-Rate Sensitivity", score: 72, rank: 40 }),
        entry({ id: "VALUE_CYCLICAL", label: "Value / Cyclical Exposure", score: 71, rank: 45 }),
      ],
      [],
    ),
  );
  assert.ok(result);
  assert.match(result.factorSentence, /fairly balanced/);
});

test("contra when bottom 10% and score ≤ 40 (Lower column only)", () => {
  const result = buildFactorProfileBlurb(
    profile(
      [entry({ id: "VALUE_CYCLICAL", label: "Value / Cyclical Exposure", score: 70, rank: 20 })],
      [entry({ id: "MOMENTUM", label: "Momentum Exposure", score: 38, rank: 1250 })],
    ),
  );
  assert.ok(result);
  assert.match(result.factorSentence, /move the other way when Momentum leads/);
});

test("bottom 10% but score 45 stays less-tied not contra", () => {
  const result = buildFactorProfileBlurb(
    profile(
      [],
      [entry({ id: "MOMENTUM", label: "Momentum Exposure", score: 45, rank: 1250 })],
    ),
  );
  assert.ok(result);
  assert.match(result.factorSentence, /less tied to Momentum/);
  assert.doesNotMatch(result.factorSentence, /other way|opposite/);
});

test("kinda high uses softer wording", () => {
  // ~15% of 1287 ≈ rank 193
  const result = buildFactorProfileBlurb(
    profile(
      [entry({ id: "CREDIT_RISK_ON", label: "Credit Risk-On Sensitivity", score: 58, rank: 200 })],
      [],
    ),
  );
  assert.ok(result);
  assert.match(result.factorSentence, /some link to Credit Risk-On/);
  assert.doesNotMatch(result.factorSentence, /Sensitivity/);
});

test("sector gate requires score and rank", () => {
  assert.equal(
    buildSectorBlurbSentence(entry({ id: "X", label: "Tech", score: 75, rank: 400 })),
    null,
  );
  assert.equal(
    buildSectorBlurbSentence(entry({ id: "X", label: "Tech", score: 55, rank: 10 })),
    null,
  );
  const modest = buildSectorBlurbSentence(
    entry({ id: "X", label: "Tech", score: 62, rank: 200 }),
  );
  assert.ok(modest);
  assert.match(modest, /modest match/);
});

test("suppressConflictingHighs drops both members", () => {
  const out = suppressConflictingHighs([
    {
      id: "VALUE_CYCLICAL",
      label: "Value / Cyclical",
      strength: "definite",
      score: 70,
      rank: 10,
      total: 100,
      extremity: 0.1,
    },
    {
      id: "GROWTH_DURATION",
      label: "Growth / Duration",
      strength: "definite",
      score: 69,
      rank: 11,
      total: 100,
      extremity: 0.11,
    },
    {
      id: "MOMENTUM",
      label: "Momentum",
      strength: "kinda",
      score: 60,
      rank: 18,
      total: 100,
      extremity: 0.18,
    },
  ]);
  assert.deepEqual(
    out.map((x) => x.id),
    ["MOMENTUM"],
  );
});
