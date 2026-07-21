import { describe, expect, it } from "vitest";
import { createFrameCraftDb, createSettingsRepository } from "../app/framecraft/storage";

describe("settings repository", () => {
  it("persists language and prompt defaults", async () => {
    const db = createFrameCraftDb(`settings-test-${crypto.randomUUID()}`);
    const repository = createSettingsRepository(db);
    await repository.save({
      id: "app", language: "en", defaultMode: "video", defaultPlatform: "kling",
      updatedAt: "2026-07-21T00:00:00.000Z",
    });

    expect(await repository.get()).toMatchObject({ language: "en", defaultPlatform: "kling" });
  });
});
