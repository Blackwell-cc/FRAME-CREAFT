import { describe, expect, it } from "vitest";
import { createFrameCraftDb, createPromptRepository } from "../app/framecraft/storage";
import type { SavedPrompt } from "../app/framecraft/types";

describe("saved prompt repository", () => {
  it("persists, updates, and lists saved prompts", async () => {
    const db = createFrameCraftDb(`prompt-test-${crypto.randomUUID()}`);
    const repository = createPromptRepository(db);
    const now = "2026-07-21T00:00:00.000Z";
    const prompt: SavedPrompt = {
      id: "prompt-1",
      name: "Director MCU",
      mode: "image",
      platform: "generic-image",
      input: {
        mode: "image", platform: "generic-image", subject: "a director", action: "",
        environment: "", shotSize: "medium close-up", angle: "", lens: "", movement: "",
        lighting: "", composition: "", mood: "monochrome", aspectRatio: "16:9",
        duration: "", pacing: "",
      },
      generatedPrompt: "Medium close-up of a director, monochrome.",
      editedPrompt: "Medium close-up of a director, monochrome.",
      isFavorite: true,
      createdAt: now,
      updatedAt: now,
    };

    await repository.save(prompt);
    await repository.update("prompt-1", { name: "Director portrait" });

    const records = await repository.list();
    const stored = await repository.getById("prompt-1");

    expect(records).toHaveLength(1);
    expect(stored).toMatchObject({
      schemaVersion: 2,
      name: "Director portrait",
      selectedTechniqueIds: [],
      outputLanguage: "en",
      promptState: "auto",
    });
    expect(stored?.structuredDraft).toMatchObject({
      prompt: prompt.generatedPrompt,
      negativePrompt: "",
      warnings: [],
      shots: [],
    });
  });
});
