import { describe, expect, it } from "vitest";
import { starterTechniques } from "../app/framecraft/seed-data";
import {
  fromCloudSavedPrompt,
  fromCloudSettings,
  fromCloudTechnique,
  toCloudSavedPrompt,
  toCloudSettings,
  toCloudTechnique,
} from "../app/framecraft/cloud/mappers";
import { upgradeSavedPrompt } from "../app/framecraft/saved-prompt-schema";
import type { AppSettings, SavedPrompt } from "../app/framecraft/types";

const userId = "11111111-1111-4111-8111-111111111111";

describe("cloud mappers", () => {
  it("round-trips every public technique field with a stable text ID", () => {
    const technique = starterTechniques[0];
    const row = toCloudTechnique(technique);

    expect(row.id).toBe(technique.id);
    expect(row.title_en).toBe(technique.titleEn);
    expect(row.generic_image_prompt).toBe(technique.genericImagePrompt);
    expect(row).not.toHaveProperty("is_favorite");
    expect(fromCloudTechnique(row)).toEqual(technique);
  });

  it("round-trips a private saved prompt without leaking favorite state", () => {
    const prompt: SavedPrompt = {
      id: "prompt-1",
      name: "Close-up portrait",
      mode: "image",
      platform: "midjourney",
      input: {
        mode: "image",
        platform: "midjourney",
        subject: "a cinematographer",
        action: "reviewing a monitor",
        environment: "studio",
        shotSize: "close-up",
        angle: "eye-level",
        lens: "85mm",
        movement: "static",
        lighting: "softbox",
        composition: "centered",
        mood: "focused",
        aspectRatio: "16:9",
        duration: "",
        pacing: "",
      },
      generatedPrompt: "generated",
      editedPrompt: "edited",
      isFavorite: false,
      createdAt: "2026-07-21T00:00:00.000Z",
      updatedAt: "2026-07-21T01:00:00.000Z",
    };

    const row = toCloudSavedPrompt(prompt, userId);
    expect(row.user_id).toBe(userId);
    expect(row.generated_prompt).toBe("generated");
    expect(row.input._framecraftV2).toMatchObject({
      schemaVersion: 2,
      selectedTechniqueIds: [],
      outputLanguage: "en",
      promptState: "manual",
    });
    expect(row).not.toHaveProperty("is_favorite");
    expect(fromCloudSavedPrompt(row)).toEqual(upgradeSavedPrompt(prompt));
  });

  it("round-trips private user settings", () => {
    const settings: AppSettings = {
      id: "app",
      language: "th",
      defaultMode: "video",
      defaultPlatform: "kling",
      updatedAt: "2026-07-21T02:00:00.000Z",
    };

    const row = toCloudSettings(settings, userId);
    expect(row.default_mode).toBe("video");
    expect(fromCloudSettings(row)).toEqual(settings);
  });
});
