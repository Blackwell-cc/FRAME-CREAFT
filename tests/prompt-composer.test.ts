import { describe, expect, it } from "vitest";
import {
  composePrompt,
  platformPresets,
  validateDuration,
} from "../app/framecraft/prompt-composer";
import { starterTechniques } from "../app/framecraft/seed-data";
import type { PromptInput } from "../app/framecraft/types";

function technique(id: string) {
  const result = starterTechniques.find((item) => item.id === id);
  if (!result) throw new Error(`Missing test technique: ${id}`);
  return result;
}

const baseInput: PromptInput = {
  mode: "image",
  platform: "generic-image",
  subject: "a Thai film director",
  action: "reviewing a monitor",
  environment: "in a professional production studio",
  shotSize: "",
  angle: "",
  lens: "",
  movement: "",
  lighting: "",
  composition: "",
  mood: "",
  aspectRatio: "16:9",
  duration: "",
  pacing: "",
};

describe("prompt composer", () => {
  it("composes an image prompt from semantic inputs and ordered cards", () => {
    const result = composePrompt({
      input: baseInput,
      selected: [
        technique("shot-close-up"),
        technique("angle-low-angle"),
        technique("light-soft-key-light"),
        technique("light-hard-light"),
        technique("comp-rule-of-thirds"),
      ],
      outputLanguage: "en",
    });

    expect(result.prompt).toContain(
      "Subject: a Thai film director; Action: reviewing a monitor; Environment: in a professional production studio.",
    );
    expect(result.prompt).toContain("Shot size: cinematic close-up");
    expect(result.prompt).toContain("Camera angle: low angle perspective");
    expect(result.prompt).toContain(
      "Lighting: large soft key light, gentle shadow transition; hard directional light, crisp shadows",
    );
    expect(result.prompt).toContain(
      "Composition: rule of thirds composition, intentional negative space",
    );
    expect(result.warnings).toEqual([]);
  });

  it("builds a video shot sequence in the order cards were added", () => {
    const result = composePrompt({
      input: {
        ...baseInput,
        mode: "video",
        platform: "veo",
        duration: "8",
        pacing: "slow and controlled",
      },
      selected: [
        technique("shot-close-up"),
        technique("angle-low-angle"),
        technique("move-dolly-in"),
        technique("shot-wide-shot"),
        technique("angle-eye-level"),
      ],
      outputLanguage: "en",
    });

    expect(result.shots.map((shot) => shot.shotSize?.id)).toEqual([
      "shot-close-up",
      "shot-wide-shot",
    ]);
    expect(result.shots.map((shot) => shot.transition)).toEqual([
      "opening",
      "finally",
    ]);
    expect(result.shots[0].techniques.map((item) => item.id)).toEqual([
      "shot-close-up",
      "angle-low-angle",
      "move-dolly-in",
    ]);
    expect(result.prompt).toContain("Opening shot 1");
    expect(result.prompt).toContain("Finally, shot 2");
    expect(result.prompt).toContain("Duration: 8 seconds.");
    expect(result.prompt).toContain("Pacing: slow and controlled.");
  });

  it("writes semantic labels and duration in Thai", () => {
    const result = composePrompt({
      input: { ...baseInput, mode: "video", platform: "generic-video", duration: "12" },
      selected: [technique("shot-close-up")],
      outputLanguage: "th",
    });

    expect(result.prompt).toContain("ตัวแบบ: a Thai film director");
    expect(result.prompt).toContain("การกระทำ: reviewing a monitor");
    expect(result.prompt).toContain("สถานที่: in a professional production studio");
    expect(result.prompt).toContain("ระยะภาพ: ภาพใกล้");
    expect(result.prompt).toContain("ระยะเวลา: 12 วินาที");
  });

  it("validates a numeric duration from 1 to 600 seconds", () => {
    expect(validateDuration("")).toEqual({ valid: true, value: null });
    expect(validateDuration("8")).toEqual({ valid: true, value: 8 });
    expect(validateDuration("0")).toEqual({
      valid: false,
      messageTh: "กรอกระยะเวลา 1–600 วินาที",
      messageEn: "Enter a duration from 1–600 seconds",
    });
    expect(validateDuration("8 seconds")).toMatchObject({ valid: false });
    expect(validateDuration("601")).toMatchObject({ valid: false });
  });

  it("returns completeness and within-shot conflict warnings", () => {
    const result = composePrompt({
      input: {
        ...baseInput,
        mode: "video",
        subject: "",
        action: "",
        environment: "",
      },
      selected: [
        technique("shot-close-up"),
        technique("angle-low-angle"),
        technique("angle-eye-level"),
      ],
      outputLanguage: "en",
    });

    expect(result.warnings).toEqual([
      "missing-subject",
      "missing-action",
      "missing-environment",
      "multiple-camera-angles-in-shot-1",
    ]);
  });

  it("warns about invalid duration without emitting an unusable directive", () => {
    const result = composePrompt({
      input: { ...baseInput, mode: "video", duration: "eight" },
      selected: [technique("shot-close-up")],
      outputLanguage: "en",
    });

    expect(result.warnings).toContain("invalid-duration");
    expect(result.prompt).not.toContain("Duration:");
  });

  it("uses legacy prompt fields only when no cards are selected", () => {
    const result = composePrompt({
      input: {
        ...baseInput,
        shotSize: "medium close-up",
        angle: "eye-level angle",
        lens: "85mm lens",
        lighting: "soft studio lighting",
      },
      selected: [],
      outputLanguage: "en",
    });

    expect(result.prompt).toContain("Shot size: medium close-up");
    expect(result.prompt).toContain("Camera angle: eye-level angle");
    expect(result.prompt).toContain("Lens: 85mm lens");
    expect(result.prompt).toContain("Lighting: soft studio lighting");
  });

  it("preserves platform-specific directives", () => {
    const midjourney = composePrompt({
      input: { ...baseInput, platform: "midjourney", aspectRatio: "4:5" },
      selected: [technique("shot-close-up")],
      outputLanguage: "en",
    });
    const runway = composePrompt({
      input: { ...baseInput, mode: "video", platform: "runway", duration: "6" },
      selected: [technique("shot-close-up")],
      outputLanguage: "en",
    });

    expect(midjourney.prompt).toContain("--ar 4:5");
    expect(runway.prompt).toContain(
      "Continuous coherent motion, stable subject identity.",
    );
  });

  it("exposes all seven approved platform presets", () => {
    expect(platformPresets.map((preset) => preset.id)).toEqual([
      "generic-image",
      "midjourney",
      "flux",
      "generic-video",
      "runway",
      "kling",
      "veo",
    ]);
  });
});
