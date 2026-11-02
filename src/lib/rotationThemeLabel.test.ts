import { describe, expect, it } from "vitest";

import {
  groupEyebrowFromThemeName,
  splitThemeDisplayName,
  stripThemeYearInProse,
  stripThemeYearSuffix,
  themeDisplayLabel,
} from "./rotationThemeLabel";

describe("themeDisplayLabel", () => {
  it("strips apostrophe year from the group prefix", () => {
    expect(themeDisplayLabel("Space Supply Chain '26: Surveillance Satellites")).toBe(
      "Space Supply Chain: Surveillance Satellites",
    );
    expect(themeDisplayLabel("MedTech Long ’25: Diagnostic Platforms")).toBe(
      "MedTech Long: Diagnostic Platforms",
    );
  });

  it("handles bare labels and empty input", () => {
    expect(themeDisplayLabel("AI '24")).toBe("AI");
    expect(themeDisplayLabel("")).toBe("");
    expect(themeDisplayLabel("No Year Theme")).toBe("No Year Theme");
  });
});

describe("splitThemeDisplayName", () => {
  it("returns year-free group prefix", () => {
    expect(splitThemeDisplayName("Euro Spend '26: European Shipbuilding")).toEqual({
      title: "European Shipbuilding",
      groupPrefix: "Euro Spend",
    });
  });
});

describe("stripThemeYearSuffix / prose / eyebrow", () => {
  it("strips trailing year", () => {
    expect(stripThemeYearSuffix("Software '26")).toBe("Software");
  });

  it("strips inline year tokens in prose", () => {
    expect(
      stripThemeYearInProse("Space Supply Chain '26: Surveillance Satellites is a theme."),
    ).toBe("Space Supply Chain: Surveillance Satellites is a theme.");
  });

  it("eyebrow uses year-free prefix", () => {
    expect(groupEyebrowFromThemeName("Software '26: Legal AI")).toBe("Software");
  });
});
