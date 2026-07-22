import { describe, expect, it } from "vitest";
import { categoryGuides, categoryOrder } from "../app/framecraft/category-guides";

describe("category guides", () => {
  it("defines seven ordered bilingual production chapters", () => {
    expect(categoryOrder).toEqual([
      "shot-size", "camera-angle", "camera-movement", "lighting",
      "composition", "lens", "camera-settings",
    ]);
    expect(Object.keys(categoryGuides)).toHaveLength(7);
    for (const category of categoryOrder) {
      expect(categoryGuides[category].descriptionTh.length).toBeGreaterThan(30);
      expect(categoryGuides[category].tipTh.length).toBeGreaterThan(30);
      expect(categoryGuides[category].promptFormula).toContain("{");
    }
  });
});
