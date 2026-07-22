import { beforeEach, describe, expect, it } from "vitest";
import { createFrameCraftDb, createTechniqueRepository } from "../app/framecraft/storage";
import { starterTechniques } from "../app/framecraft/seed-data";

describe("local repository", () => {
  const db = createFrameCraftDb(`framecraft-test-${crypto.randomUUID()}`);
  const repository = createTechniqueRepository(db);

  beforeEach(async () => {
    await db.techniques.clear();
    await db.meta.clear();
  });

  it("seeds once and keeps user changes", async () => {
    await repository.ensureSeeded(starterTechniques);
    await repository.update("shot-extreme-wide", { isFavorite: true });
    await repository.ensureSeeded(starterTechniques);

    expect(await repository.count()).toBe(60);
    expect((await repository.getById("shot-extreme-wide"))?.isFavorite).toBe(true);
  });

  it("searches Thai and English content", async () => {
    await repository.ensureSeeded(starterTechniques);
    expect((await repository.search("โดดเดี่ยว")).map((item) => item.slug)).toContain(
      "extreme-wide-shot",
    );
    expect((await repository.search("low angle")).map((item) => item.slug)).toContain(
      "low-angle",
    );
  });
});
