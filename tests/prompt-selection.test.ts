import { describe, expect, it } from "vitest";
import {
  reconcileSelectionForMode,
  validateTechniqueSelection,
} from "../app/framecraft/prompt-selection";
import { starterTechniques } from "../app/framecraft/seed-data";

function technique(id: string) {
  const result = starterTechniques.find((item) => item.id === id);
  if (!result) throw new Error(`Missing test technique: ${id}`);
  return result;
}

describe("prompt selection", () => {
  it("blocks a second single-value image category", () => {
    const current = [technique("shot-close-up")];

    expect(
      validateTechniqueSelection(
        "image",
        current,
        technique("shot-extreme-close-up"),
      ),
    ).toMatchObject({
      allowed: false,
      reason: "single-category-limit",
      currentTechniqueId: "shot-close-up",
    });
  });

  it("allows multiple lighting and composition cards in image mode", () => {
    expect(
      validateTechniqueSelection(
        "image",
        [technique("light-soft-key-light")],
        technique("light-hard-light"),
      ),
    ).toEqual({ allowed: true });
    expect(
      validateTechniqueSelection(
        "image",
        [technique("comp-rule-of-thirds")],
        technique("comp-centered-composition"),
      ),
    ).toEqual({ allowed: true });
  });

  it("allows distinct cards from the same category in video mode", () => {
    expect(
      validateTechniqueSelection(
        "video",
        [technique("shot-close-up")],
        technique("shot-extreme-close-up"),
      ),
    ).toEqual({ allowed: true });
  });

  it("blocks a duplicate technique id in either mode", () => {
    for (const mode of ["image", "video"] as const) {
      expect(
        validateTechniqueSelection(
          mode,
          [technique("shot-close-up")],
          technique("shot-close-up"),
        ),
      ).toMatchObject({ allowed: false, reason: "duplicate" });
    }
  });

  it("reports extra single-value cards removed when switching to image", () => {
    const selected = [
      technique("shot-close-up"),
      technique("shot-extreme-close-up"),
      technique("light-soft-key-light"),
      technique("light-hard-light"),
    ];

    const result = reconcileSelectionForMode("image", selected);

    expect(result.kept.map((item) => item.id)).toEqual([
      "shot-close-up",
      "light-soft-key-light",
      "light-hard-light",
    ]);
    expect(result.removed.map((item) => item.id)).toEqual([
      "shot-extreme-close-up",
    ]);
  });
});
