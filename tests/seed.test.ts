import { describe, expect, it } from "vitest";
import { starterTechniques } from "../app/framecraft/seed-data";

describe("starter library", () => {
  it("contains exactly 60 unique techniques across seven categories", () => {
    expect(starterTechniques).toHaveLength(60);
    expect(new Set(starterTechniques.map((item) => item.id)).size).toBe(60);
    expect(new Set(starterTechniques.map((item) => item.category)).size).toBe(7);
  });

  it("provides bilingual production guidance and image/video prompts", () => {
    for (const item of starterTechniques) {
      expect(item.titleEn).toBeTruthy();
      expect(item.titleTh).toBeTruthy();
      expect(item.descriptionTh).toBeTruthy();
      expect(item.useCasesTh).toBeTruthy();
      expect(item.warningsTh).toBeTruthy();
      expect(item.genericImagePrompt).toBeTruthy();
      expect(item.genericVideoPrompt).toBeTruthy();
    }
  });
});
