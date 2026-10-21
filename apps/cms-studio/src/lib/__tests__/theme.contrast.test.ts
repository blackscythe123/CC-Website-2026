import { describe, expect, it } from "vitest";
import { CONTRAST_PAIRS, TOKENS } from "@/lib/theme/tokens";
import { contrastRatio } from "@/lib/theme/contrast";

describe.each(["light", "dark"] as const)("%s theme contrast", (theme) => {
  it.each(CONTRAST_PAIRS)("$label ≥ $min", ({ fg, bg, min }) => {
    expect(contrastRatio(TOKENS[theme][fg], TOKENS[theme][bg])).toBeGreaterThanOrEqual(min);
  });
});

it("contrastRatio matches known values", () => {
  expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
  expect(contrastRatio("#E11D48", "#FFFFFF")).toBeCloseTo(4.7, 1);
});
