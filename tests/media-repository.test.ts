import { describe, expect, it } from "vitest";
import { createFrameCraftDb, createMediaRepository } from "../app/framecraft/storage";
import type { MediaRecord } from "../app/framecraft/types";

describe("reference media repository", () => {
  it("stores and retrieves an uploaded image by technique", async () => {
    const db = createFrameCraftDb(`media-test-${crypto.randomUUID()}`);
    const repository = createMediaRepository(db);
    const now = "2026-07-21T00:00:00.000Z";
    const record: MediaRecord = {
      id: "media-1",
      techniqueId: "custom-1",
      blob: new Blob(["image"], { type: "image/webp" }),
      mimeType: "image/webp",
      width: 0,
      height: 0,
      byteSize: 5,
      altTh: "ภาพอ้างอิงส่วนตัว",
      altEn: "Personal reference image",
      createdAt: now,
      updatedAt: now,
    };

    await repository.save(record);

    expect((await repository.getByTechnique("custom-1"))?.mimeType).toBe("image/webp");
    expect(await repository.list()).toHaveLength(1);
  });
});
