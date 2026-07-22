import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { createBackupArchive, inspectBackupArchive } from "../app/framecraft/backup-service";
import { starterTechniques } from "../app/framecraft/seed-data";
import type { LocalFavoriteRecord, MediaRecord } from "../app/framecraft/types";

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
      favorites: [{
        id: "owner:technique:shot-close-up",
        userId: "owner",
        entityType: "technique",
        entityId: "shot-close-up",
        createdAt: now,
      } satisfies LocalFavoriteRecord],
      cloudMetadata: [{ key: "last-synced-at", value: now, updatedAt: now }],
    });
    const result = inspectBackupArchive(archive);

    expect(result.manifest.schemaVersion).toBe(2);
    expect(result.manifest.counts.techniques).toBe(60);
    expect(result.manifest.counts.media).toBe(1);
    expect(result.techniques[0].slug).toBe("extreme-wide-shot");
    expect(await result.media[0].blob.text()).toBe("reference-image");
    expect(result.favorites).toHaveLength(1);
    expect(result.cloudMetadata[0].key).toBe("last-synced-at");
  });

  it("continues to import a valid schema v1 archive", () => {
    const manifest = {
      app: "FRAME / CRAFT",
      appVersion: "0.1.0",
      schemaVersion: 1,
      exportedAt: "2026-07-21T00:00:00.000Z",
      counts: { techniques: 0, prompts: 0, media: 0 },
      mediaChecksums: {},
    };
    const archive = zipSync({
      "manifest.json": strToU8(JSON.stringify(manifest)),
      "techniques.json": strToU8("[]"),
      "prompts.json": strToU8("[]"),
      "settings.json": strToU8("null"),
      "media.json": strToU8("[]"),
    });

    const result = inspectBackupArchive(archive);

    expect(result.manifest.schemaVersion).toBe(1);
    expect(result.favorites).toEqual([]);
    expect(result.cloudMetadata).toEqual([]);
  });

  it("rejects unsafe URLs and unexpected archive files", async () => {
    const unsafe = { ...starterTechniques[0], videoReferenceUrl: "javascript:alert(1)" };
    const archive = await createBackupArchive({
      techniques: [unsafe], prompts: [], settings: null, media: [],
      favorites: [], cloudMetadata: [],
    });
    const unpacked = await import("fflate").then(({ unzipSync }) => unzipSync(archive));
    const withUnexpectedFile = zipSync({ ...unpacked, "secret.txt": strToU8("no") });

    expect(() => inspectBackupArchive(archive)).toThrow("ไฟล์ Backup ไม่ถูกต้อง");
    expect(() => inspectBackupArchive(withUnexpectedFile)).toThrow("ไฟล์ Backup ไม่ถูกต้อง");
  });

  it("rejects invalid archives without returning partial records", () => {
    expect(() => inspectBackupArchive(new Uint8Array([1, 2, 3]))).toThrow(
      "ไฟล์ Backup ไม่ถูกต้อง",
    );
  });
});
