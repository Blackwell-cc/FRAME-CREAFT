import { describe, expect, it } from "vitest";
import { composePrompt, platformPresets } from "../app/framecraft/prompt-composer";

describe("prompt composer", () => {
  it("composes an image prompt in a stable cinematography order", () => {
    const result = composePrompt({
      mode: "image",
      platform: "generic-image",
      subject: "a Thai film director",
      action: "reviewing a monitor",
      environment: "on a production set",
      shotSize: "cinematic medium close-up",
      angle: "low angle perspective",
      lens: "shot on a 35mm lens",
      movement: "",
      lighting: "chiaroscuro lighting",
      composition: "rule of thirds composition",
      mood: "deep monochrome color grade",
      aspectRatio: "16:9",
      duration: "",
      pacing: "",
    });

    expect(result.prompt).toBe(
      "Cinematic medium close-up of a Thai film director reviewing a monitor on a production set, low angle perspective, shot on a 35mm lens, chiaroscuro lighting, rule of thirds composition, deep monochrome color grade.",
    );
  });

  it("adds camera timing language for video presets", () => {
    const result = composePrompt({
      mode: "video",
      platform: "veo",
      subject: "a runner",
      action: "moving through rain",
      environment: "on an empty street",
      shotSize: "wide shot",
      angle: "eye-level angle",
      lens: "35mm lens",
      movement: "slow dolly in",
      lighting: "backlit rain",
      composition: "leading lines",
      mood: "high-contrast monochrome",
      aspectRatio: "16:9",
      duration: "8 seconds",
      pacing: "controlled pacing",
    });

    expect(result.prompt).toContain("Camera movement: slow dolly in.");
    expect(result.prompt).toContain("Duration: 8 seconds.");
    expect(result.prompt).toContain("Pacing: controlled pacing.");
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
