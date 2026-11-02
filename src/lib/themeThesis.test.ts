import { describe, expect, it } from "vitest";

import { themeThesisFirstSentence } from "./themeThesis";

describe("themeThesisFirstSentence", () => {
  it("returns the first sentence", () => {
    expect(
      themeThesisFirstSentence({
        thesis:
          "CPUs remain the control plane of AI servers even as GPUs grab the headlines. Memory and networking matter too.",
      }),
    ).toBe("CPUs remain the control plane of AI servers even as GPUs grab the headlines.");
  });

  it("returns empty for placeholder thesis", () => {
    expect(themeThesisFirstSentence({ thesis: "—" })).toBe("");
    expect(themeThesisFirstSentence(undefined)).toBe("");
  });

  it("keeps a single-sentence thesis", () => {
    expect(themeThesisFirstSentence({ thesis: "Only one sentence here." })).toBe(
      "Only one sentence here.",
    );
  });
});
