import type {
  PromptMode,
  Technique,
  TechniqueCategory,
} from "./types";

const imageSingleCategories = new Set<TechniqueCategory>([
  "shot-size",
  "camera-angle",
  "camera-movement",
  "lens",
  "camera-settings",
]);

export type SelectionDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "duplicate" | "single-category-limit";
      currentTechniqueId?: string;
    };

export function validateTechniqueSelection(
  mode: PromptMode,
  current: Technique[],
  candidate: Technique,
): SelectionDecision {
  if (current.some((item) => item.id === candidate.id)) {
    return { allowed: false, reason: "duplicate" };
  }

  if (mode === "image" && imageSingleCategories.has(candidate.category)) {
    const existing = current.find(
      (item) => item.category === candidate.category,
    );
    if (existing) {
      return {
        allowed: false,
        reason: "single-category-limit",
        currentTechniqueId: existing.id,
      };
    }
  }

  return { allowed: true };
}

export function reconcileSelectionForMode(
  mode: PromptMode,
  selected: Technique[],
) {
  const kept: Technique[] = [];
  const removed: Technique[] = [];

  for (const item of selected) {
    const decision = validateTechniqueSelection(mode, kept, item);
    (decision.allowed ? kept : removed).push(item);
  }

  return { kept, removed };
}
