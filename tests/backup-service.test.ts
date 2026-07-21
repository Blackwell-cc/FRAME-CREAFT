import { describe, expect, it } from "vitest";
import { createBackupArchive, inspectBackupArchive } from "../app/framecraft/backup-service";
import { starterTechniques } from "../app/framecraft/seed-data";
import type { MediaRecord } from "../app/framecraft/types";

describe("backup service", () => {
  it("round-trips techniques and media with a versioned manifest", async () => {
    const now = "2026-07-21T00:00:00.000Z";
    const media: MediaRecord = {
      id: "media-1", techniqueId: "shot-extreme-wide",
      blob: new Blob(["reference-image"], { type: "image/webp" }),
      mimeType: "image/webp", width: 0, height: 0, byteSize: 15,
      altTh: "ภาพอ้างอิง", altEn: "Reference image", createdAt: now, updatedAt: now,
    };
    const archive = await createBackupArchive({
      techniques: starterTechniques,
      prompts: [],
      settings: null,
      media: [media],
    });
    const result = inspectBackupArchive(archive);

    expect(result.manifest.schemaVersion).toBe(1);
    expect(result.manifest.counts.techniques).toBe(60);
    expect(result.manifest.counts.media).toBe(1);
    expect(result.techniques[0].slug).toBe("extreme-wide-shot");
    expect(await result.media[0].blob.text()).toBe("reference-image");
  });

  it("rejects invalid archives without returning partial records", () => {
    expect(() => inspectBackupArchive(new Uint8Array([1, 2, 3]))).toThrow(
      "ไฟล์ Backup ไม่ถูกต้อง",
    );
  });
});
